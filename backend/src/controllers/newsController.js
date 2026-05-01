const { getDb } = require("../../config/db");

function toSectionId(prefix, index) {
  return `${prefix}-${index + 1}`;
}

function normalizeVenueItem(item, fallbackCategory) {
  return {
    id: item.id || item._id?.toString?.() || null,
    category: item.category || fallbackCategory,
    name: item.name || "",
    rating: item.rating ?? null,
    address: item.address || "",
    subtitle: item.subtitle || item.cuisine || item.speciality || item.focus || "",
    highlight: item.highlight || "",
  };
}

function normalizeSections(item) {
  if (Array.isArray(item.sections) && item.sections.length > 0) {
    return item.sections.map((section, index) => {
      if (section.type === "venue-list") {
        const normalizedItems = Array.isArray(section.items)
          ? section.items.map((venue) => normalizeVenueItem(venue, venue.category || "restaurant"))
          : [];

        return {
          id: section.id || toSectionId("section", index),
          type: "venue-list",
          title: section.title || "",
          items: normalizedItems,
        };
      }

      if (section.type === "list") {
        return {
          id: section.id || toSectionId("section", index),
          type: "list",
          title: section.title || "",
          items: Array.isArray(section.items) ? section.items.filter(Boolean) : [],
        };
      }

      return {
        id: section.id || toSectionId("section", index),
        type: "paragraph",
        title: section.title || "",
        text: section.text || "",
      };
    });
  }

  const sections = [];

  if (item.details) {
    sections.push({
      id: toSectionId("section", sections.length),
      type: "paragraph",
      text: item.details,
    });
  }

  if (Array.isArray(item.topRestaurants) && item.topRestaurants.length > 0) {
    sections.push({
      id: toSectionId("section", sections.length),
      type: "venue-list",
      title: "Top Restaurants",
      items: item.topRestaurants.map((venue) => normalizeVenueItem(venue, "restaurant")),
    });
  }

  if (Array.isArray(item.topCafes) && item.topCafes.length > 0) {
    sections.push({
      id: toSectionId("section", sections.length),
      type: "venue-list",
      title: "Top Cafes",
      items: item.topCafes.map((venue) => normalizeVenueItem(venue, "cafe")),
    });
  }

  if (Array.isArray(item.openings) && item.openings.length > 0) {
    sections.push({
      id: toSectionId("section", sections.length),
      type: "venue-list",
      title: "New Openings",
      items: item.openings.map((venue) => normalizeVenueItem(venue, "opening")),
    });
  }

  return sections;
}

function normalizeNewsItem(item) {
  const publishedAt = item.publishedAt || item.date || item.createdAt || null;

  return {
    id: item._id?.toString?.() || item.id,
    title: item.title || "",
    summary: item.summary || item.description || "",
    publishedAt,
    sections: normalizeSections(item),
  };
}

exports.getAllNews = async (_req, res) => {
  try {
    let newsItems = [];

    try {
      const db = getDb();
      newsItems = await db
        .collection("News")
        .find({})
        .sort({ publishedAt: -1, date: -1, createdAt: -1 })
        .toArray();
    } catch (dbErr) {
      // If DB is not initialized (e.g., MONGODB_URI missing), fall back to bundled sample data
      console.warn('Warning: could not access DB for news; returning sample data. Error:', dbErr.message);
      newsItems = [
        {
          _id: 'sample-1',
          title: 'Top Rated Restaurants - May 2026',
          summary: "Discover Kuching's highest-rated restaurants this month from local reviews and critic picks.",
          publishedAt: '2026-05-20T10:30:00.000Z',
          sections: [
            {
              id: 'overview',
              type: 'paragraph',
              title: 'Overview',
              text: "This month's top picks stand out for consistency, flavor, and warm service."
            },
            {
              id: 'top-picks',
              type: 'venue-list',
              title: 'Top Picks',
              items: [
                {
                  id: 'r1',
                  category: 'restaurant',
                  name: 'Harbourview Grill',
                  rating: 4.9,
                  address: 'Jalan Main, Kuching Waterfront',
                  subtitle: 'Modern Malaysian',
                  highlight: 'Signature pandan-smoked lamb and panoramic river views'
                }
              ]
            }
          ],
          createdAt: '2026-05-20T10:30:00.000Z',
          updatedAt: '2026-05-20T10:30:00.000Z'
        }
      ];
    }

    const normalizedNews = newsItems.map(normalizeNewsItem);

    res.status(200).json({
      success: true,
      news: normalizedNews,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching news',
      error: error.message,
    });
  }
};

exports.createNews = async (req, res) => {
  try {
    const { title, summary, publishedAt, sections } = req.body;

    if (!title || !summary) {
      return res.status(400).json({
        success: false,
        message: "Title and summary are required",
      });
    }

    if (!Array.isArray(sections) || sections.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one section is required",
      });
    }

    const payload = {
      title,
      summary,
      publishedAt: publishedAt || new Date().toISOString(),
      sections,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const db = getDb();
    const result = await db.collection("News").insertOne(payload);

    const inserted = {
      _id: result.insertedId,
      ...payload,
    };

    res.status(201).json({
      success: true,
      news: normalizeNewsItem(inserted),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating news",
      error: error.message,
    });
  }
};

exports.updateNews = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, summary, publishedAt, sections } = req.body;

    if (!title || !summary) {
      return res.status(400).json({ success: false, message: 'Title and summary are required' });
    }

    const db = getDb();

    const update = {
      title,
      summary,
      publishedAt: publishedAt || new Date().toISOString(),
      sections: Array.isArray(sections) ? sections : [],
      updatedAt: new Date().toISOString(),
    };

    const { ObjectId } = require('mongodb');
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    // Use updateOne then fetch to avoid driver option compatibility issues
    const updateResult = await db.collection('News').updateOne(filter, { $set: update });

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'News not found' });
    }

    const updatedDoc = await db.collection('News').findOne(filter);
    res.status(200).json({ success: true, news: normalizeNewsItem(updatedDoc) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating news', error: error.message });
  }
};

exports.deleteNews = async (req, res) => {
  try {
    const { id } = req.params;
    const { ObjectId } = require('mongodb');
    const db = getDb();

    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
    const result = await db.collection('News').deleteOne(filter);

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'News not found' });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting news', error: error.message });
  }
};
