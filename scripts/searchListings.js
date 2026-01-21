#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

// ensure the project root is in require path
const projectRoot = path.resolve(__dirname, '..');
const Listing = require(path.join(projectRoot, 'models', 'listing'));

const dbUrl = process.env.ATLASDB_URL || 'mongodb://127.0.0.1:27017/wanderlust';

function escapeRegex(text) {
  return text.replace(/[-\\/\\^$*+?.()|[\]{}]/g, "\\$&");
}

async function main() {
  const term = process.argv.slice(2).join(' ').trim();
  if (!term) {
    console.error('Usage: node scripts/searchListings.js <search term>');
    process.exit(1);
  }

  try {
    await mongoose.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true });
  } catch (e) {
    console.error('Failed to connect to MongoDB:', e.message);
    process.exit(1);
  }

  const regex = new RegExp(escapeRegex(term), 'i');
  const query = {
    $or: [
      { title: regex },
      { location: regex },
      { description: regex }
    ]
  };

  try {
    const results = await Listing.find(query).limit(200).lean();
    console.log(JSON.stringify({ search: term, count: results.length, results }, null, 2));
  } catch (err) {
    console.error('Query failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
