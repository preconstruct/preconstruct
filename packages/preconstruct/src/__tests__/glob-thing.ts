import { execGlobs } from "../glob-thing";

test("it works", async () => {
  await execGlobs(["./thing"], __dirname);
});
