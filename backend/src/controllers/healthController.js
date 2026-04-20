function getHealth(_req, res) {
  res.status(200).json({
    status: "ok",
    service: "kch-bites-backend",
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  getHealth,
};
