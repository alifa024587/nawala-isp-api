const express = require("express");
const { exec } = require("child_process");
const cors = require("cors");

const app = express();
app.use(cors());

// DNS resolvers
const RESOLVERS = {
  nawala: "180.131.144.144",
  google: "8.8.8.8",
  cloudflare: "1.1.1.1",
};

// fungsi query DNS
function digQuery(dns, domain) {
  return new Promise((resolve) => {
    exec(
      `dig @${dns} ${domain} +short +time=2 +tries=1`,
      (err, stdout, stderr) => {
        if (err || stderr) {
          return resolve(null); // unreachable / error
        }

        const result = stdout.trim();
        if (!result) {
          return resolve(""); // reachable tapi kosong
        }

        resolve(result); // ada IP
      }
    );
  });
}

app.get("/check", async (req, res) => {
  const domain = req.query.domain;

  if (!domain) {
    return res.status(400).json({
      error: "parameter domain wajib",
    });
  }

  // query semua DNS
  const results = {};
  for (const [name, dns] of Object.entries(RESOLVERS)) {
    results[name] = await digQuery(dns, domain);
  }

  /**
   * LOGIKA STATUS (JUJUR & PRODUKSI-READY)
   */
  let status = "unknown";
  let explanation = "";

  // domain mati
  if (!results.google && !results.cloudflare) {
    status = "domain_unreachable";
    explanation = "Domain tidak dapat di-resolve oleh DNS publik";
  }

  // DNS publik OK, tapi DNS Nawala tidak bisa diakses dari server
  else if (
    results.google &&
    results.cloudflare &&
    results.nawala === null
  ) {
    status = "nawala_unreachable";
    explanation =
      "Server tidak dapat menjangkau DNS Nawala (kemungkinan bukan jaringan Indonesia)";
  }

  // semua DNS resolve
  else if (
    results.google &&
    results.cloudflare &&
    results.nawala
  ) {
    status = "not_blocked";
    explanation = "Domain dapat diakses normal oleh semua DNS";
  }

  // DNS publik resolve, Nawala reachable tapi kosong
  else if (
    results.google &&
    results.cloudflare &&
    results.nawala === ""
  ) {
    status = "suspected_blocked_isp";
    explanation =
      "Domain ter-resolve di DNS publik namun tidak di DNS Nawala (indikasi blokir ISP)";
  }

  res.json({
    domain,
    status,
    explanation,
    resolvers: {
      nawala: results.nawala,
      google: results.google,
      cloudflare: results.cloudflare,
    },
    note:
      "Ini bukan API resmi Nawala. Status ditentukan berdasarkan perbandingan hasil DNS resolver.",
  });
});

app.listen(3000, () => {
  console.log("✅ Multi DNS Nawala Checker API running on port 3000");
});
