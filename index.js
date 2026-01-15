const express = require("express");
const { exec } = require("child_process");
const cors = require("cors");

const app = express();
app.use(cors());

app.get("/check", (req, res) => {
  const domain = req.query.domain;

  if (!domain) {
    return res.json({
      error: "parameter domain wajib"
    });
  }

  const nawalaDNS = "180.131.144.144";

  exec(`dig @${nawalaDNS} ${domain} +short`, (err, stdout) => {
    const result = stdout.trim();
    const blocked = !result;

    res.json({
      domain,
      nawala: blocked,
      resolver: nawalaDNS,
      ip: result || null
    });
  });
});

app.listen(3000, () => {
  console.log("Nawala ISP API running on port 3000");
});
