import "dotenv/config";
import pg from "pg";
import {readdir,readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import path from "node:path";

const pool=new pg.Pool();
const dir=path.join(path.dirname(fileURLToPath(import.meta.url)),"../migrations");
const client=await pool.connect();
try{
 await client.query("CREATE TABLE IF NOT EXISTS schema_migrations(name TEXT PRIMARY KEY,applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
 for(const name of (await readdir(dir)).filter(x=>x.endsWith(".sql")).sort()){
  const exists=await client.query("SELECT 1 FROM schema_migrations WHERE name=$1",[name]);
  if(exists.rowCount)continue;
  await client.query("BEGIN");
  try{
   await client.query(await readFile(path.join(dir,name),"utf8"));
   await client.query("INSERT INTO schema_migrations(name) VALUES($1)",[name]);
   await client.query("COMMIT");
   console.log("Applied migration:",name);
  }catch(error){await client.query("ROLLBACK");throw error;}
 }
}finally{client.release();await pool.end();}
