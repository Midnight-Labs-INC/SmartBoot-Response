const fs=require("fs/promises");

async function generateTTS(text,output){
  if(!process.env.ELEVENLABS_API_KEY||!process.env.ELEVENLABS_VOICE_ID)throw new Error("ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID are required");
  const url=`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(process.env.ELEVENLABS_VOICE_ID)}?output_format=mp3_44100_128`;
  const response=await fetch(url,{method:"POST",headers:{"xi-api-key":process.env.ELEVENLABS_API_KEY,"Content-Type":"application/json","Accept":"audio/mpeg"},body:JSON.stringify({text,model_id:process.env.ELEVENLABS_MODEL_ID||"eleven_flash_v2_5"})});
  if(!response.ok)throw new Error(`ElevenLabs TTS failed (${response.status}): ${(await response.text()).slice(0,500)}`);
  await fs.writeFile(output,Buffer.from(await response.arrayBuffer()));
  return output;
}
module.exports={generateTTS};
