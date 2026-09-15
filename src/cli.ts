import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Ange URL: ", (url: string) => {
  console.log(`\nStartar QA-test för: ${url}`);

  rl.close();
});