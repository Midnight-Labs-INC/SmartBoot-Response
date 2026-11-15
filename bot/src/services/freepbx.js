const net=require("net");
const tls=require("tls");
const path=require("path");
const {spawn}=require("child_process");

function ami(action){
  return new Promise((resolve,reject)=>{
    const host=process.env.PBX_HOST,port=Number(process.env.PBX_AMI_PORT||5038);
    if(!host||!process.env.PBX_AMI_USERNAME||!process.env.PBX_AMI_SECRET)return reject(new Error("PBX_HOST, PBX_AMI_USERNAME and PBX_AMI_SECRET are required"));
    const secure=process.env.PBX_AMI_TLS==="true";
    const socket=secure?tls.connect({host,port,rejectUnauthorized:process.env.PBX_AMI_TLS_INSECURE!=="true"}):net.connect({host,port});
    let buffer="",stage=1,done=false;
    const finish=(err,result)=>{if(done)return;done=true;clearTimeout(timer);socket.end();err?reject(err):resolve(result)};
    const timer=setTimeout(()=>finish(new Error("AMI connection timed out")),15000);
    const login=()=>socket.write(`Action: Login\r\nUsername: ${process.env.PBX_AMI_USERNAME}\r\nSecret: ${process.env.PBX_AMI_SECRET}\r\nEvents: off\r\n\r\n`);
    socket.once(secure?"secureConnect":"connect",login);
    socket.on("error",finish);
    socket.on("data",chunk=>{
      buffer+=chunk.toString();
      const packets=buffer.split("\r\n\r\n");buffer=packets.pop();
      for(const packet of packets){
        if(stage===1){
          if(!/Response: Success/i.test(packet)){return finish(new Error(`AMI login rejected: ${packet.slice(0,300)}`))}
          stage=2;socket.write(action+"\r\n\r\n");
        }else if(stage===2){
          if(/Response: Success/i.test(packet))finish(null,packet);
          else finish(new Error(`AMI originate failed: ${packet.slice(0,500)}`));
        }
      }
    });
  });
}

function upload(host,user,key,port,local,remote){
  return new Promise((resolve,reject)=>{
    const child=spawn("sftp",["-P",String(port),"-i",key,"-oBatchMode=yes","-oStrictHostKeyChecking=accept-new","-b","-",`${user}@${host}`]);
    let error="";
    child.stderr.on("data",chunk=>error+=chunk);
    child.on("error",reject);
    child.on("close",code=>code===0?resolve():reject(new Error(`SFTP upload failed: ${error.slice(0,500)} (exit ${code})`)));
    child.stdin.end(`put "${local}" "${remote}"\n`);
  });
}

async function originate(phone,audioFile){
  const host=process.env.PBX_SFTP_HOST||process.env.PBX_HOST;
  const user=process.env.PBX_SFTP_USERNAME,key=process.env.PBX_SFTP_PRIVATE_KEY;
  const port=Number(process.env.PBX_SFTP_PORT||22);
  const dir=(process.env.PBX_AUDIO_PATH||"/home/smartboot-sftp").replace(/[^a-zA-Z0-9_\/-]/g,"");
  if(!host||!user||!key)return Promise.reject(new Error("PBX_SFTP_USERNAME and PBX_SFTP_PRIVATE_KEY are required for audio upload"));
  if(!/^\d{2,15}$/.test(String(phone)))throw new Error("Invalid destination phone number");
  const name=path.basename(audioFile),remote=`${dir}/${name}`;
  await upload(host,user,key,port,audioFile,remote);
  const playback=`smartboot/${path.basename(name,".wav")}`;
  const callerId=String(process.env.PBX_CALLER_ID||"SmartBoot").replace(/[\r\n]/g,"");
  const action=["Action: Originate",`Channel: Local/${phone}@from-internal`,"Context: roblox","Exten: s","Priority: 1","Timeout: 30000",`CallerID: ${callerId}`,`Variable: AUDIO_FILE=${playback}`,"Async: true","ActionID: smartboot-"+Date.now()].join("\r\n");
  return ami(action);
}
async function checkConnection(){await ami('Action: Ping');return true;}
module.exports={originate,checkConnection};
