process.stdin.setEncoding('utf8')

process.stdin.on('data', (chunk) => {
  // const chunk = process.stdin.read()
  if (chunk !== null) {
    console.log(`data: ${chunk}`)
  }
})