const Listing = require("../models/listing");

// simple alias map for common country synonyms (module-level so it's always defined)
const aliases = {
  'england': 'United Kingdom',
  'uk': 'United Kingdom',
  'britain': 'United Kingdom',
  'great britain': 'United Kingdom',
  'united states of america': 'United States',
  'usa': 'United States',
  'us': 'United States',
  'america': 'United States'
};

module.exports.index = async (req, res) => {
  // accept multiple possible query param names from the navbar or other clients
  const term = req.query.country || req.query.q || req.query.search;
  const filter = {};
  let searched = false;
  try {
    if (term && term.toString().trim() !== "") {
      searched = true;
      let q = term.toString().trim();
      const key = q.toLowerCase();
      if (aliases[key]) {
        q = aliases[key];
      }
      const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(escapeRegExp(q), 'i');
      filter.$or = [
        { country: re },
        { location: re },
        { title: re }
      ];
    }
    const allListings = await Listing.find(filter);
    // debug logging to help diagnose why no results appear
    // console.log('Listing search term:', term);
    // console.log('Mongo filter used:', JSON.stringify(filter));
    // console.log('Results count:', allListings.length);
    res.render("listings/index.ejs", { allListings, country: term || '', searchCount: allListings.length, searched });
  } catch (err) {
    console.error('Error in listings.index:', err);
    throw err;
  }
};


module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs");
};
module.exports.showListing = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id)
    .populate({
      path: "reviews",
      populate: {
        path: "author",
      },
    })
    .populate("owner");
  if (!listing) {
    req.flash("error", "Sorry!!  does not exist your listing please recheck your listing & try again ");
    res.redirect("/listings")
  }
  //console.log(listing);
  res.render("listings/show.ejs", { listing });
};


module.exports.createListing = async (req, res, next) => {
  let url = req.file.path;
  let filename = req.file.filename;

  const newListing = new Listing(req.body.listing);
  newListing.owner = req.user._id;
  newListing.image = { url, filename }
  await newListing.save();
  req.flash("success", "New Listing Created!");
  res.redirect("/listings");
};


module.exports.renderEditForm = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Sorry!!  does not exist your listing please recheck your listing & try again ");
    res.redirect("/listings")
  }
  let originalImageUrl = listing.image.url;
  originalImageUrl = originalImageUrl.replace("/upload", "/upload/h_100,w_150")
  res.render("listings/edit.ejs", { listing, originalImageUrl });
}


module.exports.updateListing = async (req, res) => {
  let { id } = req.params;
  let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });

  if (typeof req.file !== "undefined") {
    let url = req.file.path;
    let filename = req.file.filename;
    listing.image = { url, filename };
    await listing.save();
  }
  req.flash("success", "Updated Listing")
  res.redirect(`/listings/${id}`);
}


module.exports.destroyListing = async (req, res) => {
  let { id } = req.params;
  let deletedListing = await Listing.findByIdAndDelete(id);
  console.log(deletedListing);
  req.flash("success", "Delete Listing!!")
  res.redirect("/listings")
}

