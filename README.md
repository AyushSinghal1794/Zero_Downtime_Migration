# Zero Downtime Database Migration System

This project demonstrates a **zero-downtime database migration workflow** — similar to what large-scale companies (Stripe, Uber, Airbnb, Shopify) use when moving data between database systems **without stopping traffic**.

It handles:
- ✅ Historical data migration (Backfill)
- ✅ Real-time data sync via event streaming (CDC-like)
- ✅ Data validation to ensure correctness
- ✅ Safe cutover to the new database

