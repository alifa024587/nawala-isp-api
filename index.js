const express = require("express");
const { exec } = require("child_process");
const cors = require("cors");

const app = express();
app.use(cors());

const resolvers = {
  nawala: "180.131.144.144",
  google: "8.8.8.8",
  cloudflare: "1.1.1.1"
};

function digQuery(dns, domain) {
  return new Promise((resolve) => {
    exec(`dig @${dns} ${domain} +short +time=2`, (err, stdout, stderr) => {
      if (err || stderr) {
        return resolve(null);
      }
      const result = stdout.trim();
      resolve(result || null);
    });
  });
}

app.get("/check", async (req, res) => {
  const domain = req.query.domain;
  if (!domain) {
    return res.json({ error: "parameter domain wajib" });
  }

  const results = {};

  for (const [name, dns] of Object.entries(resolvers)) {
    results[name] = await digQuery(dns, domain);
  }

  // ANALISIS
  let status = "unknown";

  if (results.google && results.cloudflare && !results.nawala) {
    status = "suspected_blocked_isp";
  } else if (results.google && results.cloudflare && results.nawala) {
    status = "not_blocked";
  } else if (!results.google && !results.cloudflare) {
    status = "domain_unreachable";
  }

  res.json({
    domain,
    status,
    resolvers: {
      nawala: results.nawala,
      google: results.google,
      cloudflare: results.cloudflare
    },
    note: "Status berdasarkan perbandingan multi DNS, bukan API resmi Nawala"
  });
});

app.listen(3000, () => {
  console.log("Multi DNS Checker API running on port 3000");
});
