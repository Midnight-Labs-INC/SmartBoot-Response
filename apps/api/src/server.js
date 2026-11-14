
import "dotenv/config";
import express from "express";
import session from "express-session";
import pgSession from "connect-pg-simple";
import pg from "pg";
import crypto from "node:crypto";

const {Pool}=pg;
const app=express();
const pool=new Pool();
const PgStore=pgSession(session);

const required=["SESSION_SECRET","DISCORD_CLIENT_ID","DISCORD_CLIENT_SECRET","DISCORD_REDIRECT_URI","DASHBOARD_URL"];
for(const key of required)if(!process.env[key])throw new Error(`Missing environment variable: ${key}`);

app.set("trust proxy",1);
app.use(express.json({limit:"32kb"}));

app.use(session({
  store:new PgStore({pool,createTableIfMissing:true}),
  name:"smartboot.sid",
  secret:process.env.SESSION_SECRET,
  resave:false,
  saveUninitialized:false,
  cookie:{
    httpOnly:true,
    secure:process.env.NODE_ENV==="production",
    sameSite:"lax",
    maxAge:8*60*60*1000
  }
}));

app.get("/health",async(_req,res)=>{
  try{
    await pool.query("SELECT 1");
    res.json({status:"ok",database:"connected"});
  }catch{
    res.status(503).json({status:"degraded",database:"unavailable"});
  }
});

app.get("/auth/discord",(req,res,next)=>{
  const state=crypto.randomBytes(32).toString("hex");
  req.session.oauthState=state;

  req.session.save(err=>{
    if(err)return next(err);

    const url=new URL("https://discord.com/oauth2/authorize");
    url.search=new URLSearchParams({
      client_id:process.env.DISCORD_CLIENT_ID,
      redirect_uri:process.env.DISCORD_REDIRECT_URI,
      response_type:"code",
      scope:"identify email",
      state
    }).toString();

    res.redirect(url.toString());
  });
});

app.get("/auth/discord/callback",async(req,res)=>{
  const {code,state,error}=req.query;

  if(error)return res.status(401).send("Discord sign-in was not completed.");

  const saved=req.session.oauthState;

  if(
    typeof code!=="string"||
    typeof state!=="string"||
    typeof saved!=="string"||
    state.length!==saved.length||
    !crypto.timingSafeEqual(Buffer.from(state),Buffer.from(saved))
  ){
    return res.status(400).send("Invalid OAuth state.");
  }

  delete req.session.oauthState;

  try{
    await new Promise((resolve,reject)=>{
      req.session.save(err=>err?reject(err):resolve());
    });

    const tokenRes=await fetch("https://discord.com/api/oauth2/token",{
      method:"POST",
      headers:{"Content-Type":"application/x-www-form-urlencoded"},
      body:new URLSearchParams({
        client_id:process.env.DISCORD_CLIENT_ID,
        client_secret:process.env.DISCORD_CLIENT_SECRET,
        grant_type:"authorization_code",
        code,
        redirect_uri:process.env.DISCORD_REDIRECT_URI
      })
    });

    const token=await tokenRes.json();

    if(!tokenRes.ok){
      console.error("[auth] Discord OAuth error:",tokenRes.status,token.error,token.error_description);
      throw new Error("Discord token exchange failed");
    }

    const userRes=await fetch("https://discord.com/api/users/@me",{
      headers:{Authorization:`Bearer ${token.access_token}`}
    });

    if(!userRes.ok)throw new Error("Discord identity lookup failed");

    const discord=await userRes.json();

    const client=await pool.connect();
    let userId,organizations;

    try{
      await client.query("BEGIN");

      const user=await client.query(
        `INSERT INTO users(discord_id,username,global_name,avatar,email,email_verified)
         VALUES($1,$2,$3,$4,$5,$6)
         ON CONFLICT(discord_id) DO UPDATE SET
         username=EXCLUDED.username,
         global_name=EXCLUDED.global_name,
         avatar=EXCLUDED.avatar,
         email=EXCLUDED.email,
         email_verified=EXCLUDED.email_verified
         RETURNING id`,
        [
          discord.id,
          discord.username,
          discord.global_name??null,
          discord.avatar??null,
          discord.email??null,
          discord.verified??null
        ]
      );

      userId=user.rows[0].id;

      let memberships=await client.query(
        "SELECT organization_id,role FROM organization_members WHERE user_id=$1",
        [userId]
      );

      if(!memberships.rowCount){
        const invite=await client.query(
          `SELECT organization_id,role FROM organization_invitations
           WHERE discord_id=$1 AND accepted_at IS NULL
           AND (expires_at IS NULL OR expires_at>NOW())
           FOR UPDATE`,
          [discord.id]
        );

        if(!invite.rowCount){
          await client.query("ROLLBACK");
          return res.status(403).send("Your Discord account has not been invited to SmartBoot Response.");
        }

        for(const item of invite.rows){
          await client.query(
            `INSERT INTO organization_members(organization_id,user_id,role)
             VALUES($1,$2,$3) ON CONFLICT DO NOTHING`,
            [item.organization_id,userId,item.role]
          );

          await client.query(
            "UPDATE organization_invitations SET accepted_at=NOW() WHERE discord_id=$1 AND organization_id=$2",
            [discord.id,item.organization_id]
          );
        }

        memberships=await client.query(
          "SELECT organization_id,role FROM organization_members WHERE user_id=$1",
          [userId]
        );
      }

      organizations=memberships.rows;

      await client.query("COMMIT");
    }catch(e){
      await client.query("ROLLBACK");
      throw e;
    }finally{
      client.release();
    }

    await new Promise((resolve,reject)=>{
      req.session.regenerate(err=>err?reject(err):resolve());
    });

    req.session.user={
      id:userId,
      discordId:discord.id,
      username:discord.username,
      globalName:discord.global_name??null,
      avatar:discord.avatar??null,
      email:discord.email??null,
      emailVerified:discord.verified??false,
      organizations
    };

    await new Promise((resolve,reject)=>{
      req.session.save(err=>err?reject(err):resolve());
    });

    res.redirect(process.env.DASHBOARD_URL);

  }catch(e){
    console.error("[auth]",e.message);
    if(!res.headersSent)res.status(502).send("Discord sign-in failed.");
  }
});

app.get("/api/v1/me",(req,res)=>{
  if(!req.session.user)return res.status(401).json({error:"unauthorized"});
  res.json({user:req.session.user});
});

app.post("/auth/logout",(req,res)=>{
  req.session.destroy(err=>{
    if(err)return res.status(500).json({error:"logout_failed"});
    res.clearCookie("smartboot.sid",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax"});
    res.status(204).end();
  });
});

app.listen(Number(process.env.PORT)||3100,"0.0.0.0",()=>{
  console.log(`SmartBoot API listening on ${process.env.PORT||3100}`);
});
