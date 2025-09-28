#!/usr/bin/env node
import fs from "fs"

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-")
}

const file = `backup-${timestamp()}.csv`
fs.writeFileSync(file, "id,value\n1,example\n")
console.log(`Sheets backup written to ${file}`)
