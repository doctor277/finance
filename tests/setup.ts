// Run every test in a UTC-5/-4 zone. `bun test` defaults to UTC, where the classic
// `new Date("2026-01-15")` off-by-one-day bug cannot show up, so date tests would
// pass even when the code is wrong for users in the Americas.
process.env.TZ = "America/Toronto";
