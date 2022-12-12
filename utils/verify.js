const { run } = require("hardhat");

async function verify(contractAdress, args) {
  try {
    await run("verify:verify", {
      address: contractAdress,
      ConstructorArguments: args,
    });
  } catch (err) {
    if (err.message.toLowerCase().includes("already verified"))
      console.log("Already Verified");
    else console.log(err);
  }
}

module.exports = verify;
