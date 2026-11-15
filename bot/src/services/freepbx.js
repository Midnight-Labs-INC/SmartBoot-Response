const net=require("net");
const tls=require("tls");
const path=require("path");
const {execFile}=require("child_process");
const {promisify}=require("util");
const runFile=promisify(execFile);

function ami(action){
  return new Promise((resolve,reject)=>{
    const host=process.env.PBX_HOST,port=Number(process.env.PBX_AMI_PORT||5038);
    if(!host||!process.env.PBX_AMI_USERNAME||!process.env.PBX_AMI_SECRET)return reject(new Error("PBX_HOST, PBX_AMI_USERNAME and PBX_AMI_SECRET are required"));
    const options={host,port};
    const socket=process.env.PBX_AMI_TLS==="true"?tls.connect({...options,rejectUnauthorized:process.env.PBX_AMI_TLS_INSECURE!=="true"}):net.connect(options);
    let buffer="",stage=0,done=false;
    const finish=(err,result)=>{if(done)return;done=true;socket.end();err?reject(err):resolve(result)};
    const timer=setTimeout(()=>finish(new Error("AMI connection timed out")),15000);
    socket.on("connect",()=>{});
    socket.on("secureConnect",()=>{});
    socket.on("error",err=>{clearTimeout(timer);finish(err)});
    socket.on("data",chunk=>{
      buffer+=chunk.toString();
      const packets=buffer.split("\r\n\r\n");buffer=packets.pop();
      for(const packet of packets){
        if(stage===0){
          stage=1;
          socket.write(`Action: Login\r\nUsername: ${process.env.PBX_AMI_USERNAME}\r\nSecret: ${process.env.PBX_AMI_SECRET}\r\nEvents: off\r\n\r\n`);
        }else if(stage===1){
          if(!/Response: Success/i.test(packet)){clearTimeout(timer);return finish(new Error(`AMI login rejected: ${packet.slice(0,300)}`))}
          stage=2;socket.write(action+"\r\n");
        }else if(stage===2){
          clearTimeout(timer);
          if(/Response: Success/i.test(packet))finish(null,packet);
          else finish(new Error(`AMI originate failed: ${packet.slice(0,500)}`));
        }
      }
    });
  });
}

async function originate(phone,audioFile){
  const host=process.env.PBX_SFTP_HOST||process.env.PBX_HOST;
  const user=process.env.PBX_SFTP_USERNAME,key=process.env.PBX_SFTP_PRIVATE_KEY;
  const port=String(process.env.PBX_SFTP_PORT||22);
  const dir=(process.env.PBX_AUDIO_PATH||"/var/lib/asterisk/sounds/smartboot").replace(/[^a-zA-Z0-9_\/-]/g,"");
  if(!host||!user||!key)throw new Error("PBX_SFTP_USERNAME and PBX_SFTP_PRIVATE_KEY are required for audio upload");
  if(!/^\d{3,15}$/.test(String(phone)))throw new Error("Invalid destination phone number");
  const name=path.basename(audioFile)+".wav",remote=`${dir}/${name}`;
  await runFile("sftp",["-P",port,"-i",key,"-oBatchMode=yes","-oStrictHostKeyChecking=accept-new",`${user}@${host}`],{input:`put "${audioFile}" "${remote}"\n`});
  const playback=`smartboot/${path.basename(name,".wav")}`;
  const callerId=process.env.PBX_CALLER_ID||"SmartBoot";
  const action=[ "Action: Originate",`Channel: Local/${phone}@from-internal`,"Context: roblox","Exten: s","Priority: 1","Timeout: 30000",`CallerID: ${callerId}`,`Variable: AUDIO_FILE=${playback}`,"Async: true","ActionID: smartboot-"+Date.now() ].join("\r\n");
  return ami(action);
}
module.exports={originate};
