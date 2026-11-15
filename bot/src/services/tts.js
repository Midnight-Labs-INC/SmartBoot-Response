const {spawn}=require("child_process");
function generateTTS(text,output){
	return new Promise((resolve,reject)=>{
		const model=process.env.PIPER_MODEL||"/app/models/en_US-lessac-medium.onnx";
		
		const child=spawn(process.env.PIPER_BIN||"/opt/piper/bin/piper",["--model",model,"--output_file",output]);
		let error="";
		child.stderr.on("data",chunk=>error+=chunk);
		child.on("error",reject);
		child.on("close",code=>code===0?resolve(output):reject(new Error(`Piper TTS failed (${code}): ${error.slice(0,500)}`)));
		child.stdin.end(String(text));
	});
}
module.exports={generateTTS};
