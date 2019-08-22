console.log(process.env.GITHUB_EVENT_PATH);
console.log(require("fs").readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
