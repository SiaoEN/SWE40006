import '../styles/NewsPage.css';
import { useEffect, useState } from 'react';
import { requestJson } from '../services/api';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';

function createSection(type = 'paragraph') {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    title: '',
    text: '',
    itemsText: '',
    venueRowsText: '',
  };
}

function normalizeSectionsForForm(sections = []) {
  const normalizedSections = [];

  sections.forEach((section) => {
    if (section.type === 'paragraph') {
      normalizedSections.push({
        id: section.id || createSection('paragraph').id,
        type: 'paragraph',
        title: section.title || '',
        text: section.text || '',
        itemsText: '',
        venueRowsText: '',
      });
      return;
    }

    if (section.type === 'list') {
      normalizedSections.push({
        id: section.id || createSection('list').id,
        type: 'list',
        title: section.title || '',
        text: '',
        itemsText: Array.isArray(section.items) ? section.items.join('\n') : '',
        venueRowsText: '',
      });
      return;
    }

    if (section.type === 'venue-list') {
      normalizedSections.push({
        id: section.id || createSection('venue-list').id,
        type: 'venue-list',
        title: section.title || '',
        text: '',
        itemsText: '',
        venueRowsText: Array.isArray(section.items)
          ? section.items
              .map((venue) => [
                venue.name || '',
                venue.rating ?? '',
                venue.subtitle || '',
                venue.address || '',
                venue.highlight || '',
              ].join(' | '))
              .join('\n')
          : '',
      });
    }
  });

  return normalizedSections;
}

function buildSectionsPayload(sections) {
  const payloadSections = [];

  sections.forEach((section) => {
    if (section.type === 'paragraph') {
      if (!section.text.trim() && !section.title.trim()) {
        return;
      }

      payloadSections.push({
        type: 'paragraph',
        title: section.title.trim(),
        text: section.text.trim(),
      });
      return;
    }

    if (section.type === 'list') {
      const items = section.itemsText
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);

      if (!section.title.trim() && items.length === 0) {
        return;
      }

      payloadSections.push({
        type: 'list',
        title: section.title.trim(),
        items,
      });
      return;
    }

    if (section.type === 'venue-list') {
      const items = section.venueRowsText
        .split('\n')
        .map((row) => row.trim())
        .filter(Boolean)
        .map((row) => {
          const [name = '', rating = '', subtitle = '', address = '', highlight = ''] = row.split('|').map((part) => part.trim());

          return {
            name,
            rating: rating ? Number(rating) || null : null,
            subtitle,
            address,
            highlight,
          };
        })
        .filter((venue) => venue.name);

      if (!section.title.trim() && items.length === 0) {
        return;
      }

      payloadSections.push({
        type: 'venue-list',
        title: section.title.trim(),
        items,
      });
    }
  });

  return payloadSections;
}

const emptyForm = {
  title: '',
  description: '',
  sections: [],
};

const formatPostTimestamp = (date = new Date()) => {
  const day = date.getDate();
  const month = new Intl.DateTimeFormat('en-GB', { month: 'long' }).format(date);
  const year = date.getFullYear();
  const hours = date.getHours();
  const hour = hours % 12 || 12;
  const minute = String(date.getMinutes()).padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';

  return `${day} ${month} ${year} ${hour}:${minute} ${period}`;
};

export default function AdminNewsPage() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [newsItems, setNewsItems] = useState([]);
  const [expandedItemId, setExpandedItemId] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const sortedNewsItems = [...newsItems].sort(
    (left, right) => new Date(right.date || right.publishedAt || right.createdAt) - new Date(left.date || left.publishedAt || left.createdAt)
  );

  useEffect(() => {
    let mounted = true;

    async function loadNews() {
      try {
        const data = await requestJson('/news');
        const items = Array.isArray(data?.news) ? data.news : [];

        const mapped = items.map((it) => {
          // Map backend shape to admin page shape
          const published = it.publishedAt || it.date || it.createdAt;
          const detailsText = (Array.isArray(it.sections) && it.sections.length > 0)
            ? it.sections
                .filter((s) => s.type === 'paragraph' && s.text)
                .map((s) => s.text)
                .join('\n\n')
            : it.summary || it.description || '';

          return {
            id: it.id || it._id || it._id?.toString?.() || Date.now(),
            title: it.title || '',
            date: published ? formatPostTimestamp(new Date(published)) : formatPostTimestamp(),
            description: it.summary || it.description || '',
            details: detailsText,
            // keep raw sections for potential future UI
            sections: it.sections || [],
          };
        });

        if (mounted) setNewsItems(mapped);
      } catch (err) {
        // keep local initial items on error
        // eslint-disable-next-line no-console
        console.error('Failed to load news for admin page', err.message || err);
      }
    }

    loadNews();

    return () => {
      mounted = false;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setEditingItemId(null);
    setFormData(emptyForm);
  };

  const addSection = (type = 'paragraph') => {
    setFormData((currentForm) => ({
      ...currentForm,
      sections: [...currentForm.sections, createSection(type)],
    }));
  };

  const updateSection = (sectionId, field, value) => {
    setFormData((currentForm) => ({
      ...currentForm,
      sections: currentForm.sections.map((section) =>
        section.id === sectionId ? { ...section, [field]: value } : section
      ),
    }));
  };

  const removeSection = (sectionId) => {
    setFormData((currentForm) => ({
      ...currentForm,
      sections: currentForm.sections.filter((section) => section.id !== sectionId),
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!formData.title.trim() || !formData.description.trim()) {
      return;
    }

    const timestamp = formatPostTimestamp();
    const sectionsPayload = buildSectionsPayload(formData.sections);

    if (editingItemId) {
      (async () => {
        try {
          const payload = {
            title: formData.title.trim(),
            summary: formData.description.trim(),
            publishedAt: new Date().toISOString(),
            sections: sectionsPayload.length > 0 ? sectionsPayload : [
              {
                type: 'paragraph',
                title: '',
                text: formData.description.trim(),
              },
            ],
          };

          const updated = await requestJson(`/news/${editingItemId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' },
          });

          const updatedItem = updated?.news;
          if (updatedItem) {
            const mapped = {
              id: updatedItem.id || updatedItem._id || editingItemId,
              title: updatedItem.title || '',
              date: updatedItem.publishedAt
                ? formatPostTimestamp(new Date(updatedItem.publishedAt))
                : formatPostTimestamp(),
              description: updatedItem.summary || '',
              details:
                (Array.isArray(updatedItem.sections) && updatedItem.sections.length > 0)
                  ? updatedItem.sections.map((s) => s.text || '').join('\n\n')
                  : updatedItem.summary || '',
              sections: updatedItem.sections || [],
              editedNote: `Edited by ${timestamp}`,
            };

            setNewsItems((currentItems) =>
              currentItems.map((item) => (item.id === editingItemId ? mapped : item))
            );
            setExpandedItemId(mapped.id);
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Failed to update news', err.message || err);
        } finally {
          resetForm();
        }
      })();
      return;
    }

    (async () => {
      try {
        const payload = {
          title: formData.title.trim(),
          summary: formData.description.trim(),
          publishedAt: new Date().toISOString(),
          sections: sectionsPayload.length > 0 ? sectionsPayload : [
            {
              type: 'paragraph',
              title: '',
              text: formData.description.trim(),
            },
          ],
        };

        const created = await requestJson('/news', {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' },
        });

        // backend returns created news under `news`
        const createdItem = created?.news;
        if (createdItem) {
          const mapped = {
            id: createdItem.id || createdItem._id || Date.now(),
            title: createdItem.title || '',
            date: createdItem.publishedAt
              ? formatPostTimestamp(new Date(createdItem.publishedAt))
              : formatPostTimestamp(),
            description: createdItem.summary || '',
            details:
              (Array.isArray(createdItem.sections) && createdItem.sections.length > 0)
                ? createdItem.sections.map((s) => s.text || '').join('\n\n')
                : createdItem.summary || '',
            sections: createdItem.sections || [],
          };

          setNewsItems((currentItems) => [mapped, ...currentItems]);
          setExpandedItemId(mapped.id);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to create news', err.message || err);
      } finally {
        resetForm();
      }
    })();
  };

  const handleEdit = (item) => {
    const normalized = normalizeSectionsForForm(item.sections || []);
    setEditingItemId(item.id);
    setFormData({
      title: item.title,
      description: item.description,
      sections: normalized,
    });
    setExpandedItemId(item.id);
  };

  function renderVenueList(section) {
    return (
        <div key={section.id} className="news-section">
            {section.title && <h4 className="news-section-title">{section.title}</h4>}

            <ul className="restaurant-list">
                {section.items.map((venue, index) => (
                <li key={venue.id || `${section.id}-${index}`} className="restaurant-item">
                    <div className="rest-row">
                    <strong className="rest-name">{venue.name}</strong>
                    {venue.rating !== null && venue.rating !== undefined && (
                        <span className="rest-rating">{venue.rating} ★</span>
                    )}
                    </div>
                    {(venue.subtitle || venue.address) && (
                    <div className="rest-meta">
                        {[venue.subtitle, venue.address].filter(Boolean).join(' - ')}
                    </div>
                    )}
                    {venue.highlight && (
                    <div className="rest-highlight">{venue.highlight}</div>
                    )}
                </li>
                ))}
            </ul>
        </div>
    );
    }

  function renderSection(section, index) {
    const key = section.id || `section-${index}`;

    if (section.type === 'list') {
      return (
        <div className="news-section" key={key}>
          {section.title && <h4 className="news-section-title">{section.title}</h4>}
          <ul className="restaurant-list">
            {(section.items || []).map((entry, i) => (
              <li key={`${key}-item-${i}`} className="restaurant-item">
                <div className="rest-meta">{entry}</div>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    if (section.type === 'venue-list') {
      return renderVenueList({ ...section, id: key, items: Array.isArray(section.items) ? section.items : [] });
    }

    return (
      <div className="news-section" key={key}>
        {section.title && <h4 className="news-section-title">{section.title}</h4>}
        {section.text && <p className="item-details">{section.text}</p>}
      </div>
    );
  }

  const handleDelete = (itemId) => {
    (async () => {
      try {
        await requestJson(`/news/${itemId}`, { method: 'DELETE' });
        setNewsItems((currentItems) => currentItems.filter((item) => item.id !== itemId));

        if (expandedItemId === itemId) {
          setExpandedItemId(null);
        }

        if (editingItemId === itemId) {
          resetForm();
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to delete news', err.message || err);
      }
    })();
  };

  const handleLogout = () => {
		localStorage.removeItem("token");
		localStorage.removeItem("user");
		window.location.href = "/login";
	}

	const menuItems = [
		{ label: 'Profile', to: '/profile' }
	];

  return (
    <main className="news-page admin-news-page">
      {/* HEADER */}
      <Header
        title="Manage News"
        subtitle="Create new posts, update existing ones, or remove outdated news."
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        handleLogout={handleLogout}
        menuItems={menuItems}
      />

      <section className="admin-panel">
        <h3>{editingItemId ? 'Edit News Post' : 'Post News'}</h3>
        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="admin-field">
            <label htmlFor="news-title">Title</label>
            <input
              id="news-title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter news title"
            />
          </div>

          <div className="admin-field admin-field-wide">
            <label htmlFor="news-description">Description</label>
            <textarea
              id="news-description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Short summary for the news card"
            />
          </div>

          <div className="admin-field-wide admin-section-editor">
            <div className="admin-section-editor-header">
              <div>
                <label>Details</label>
                <p className="admin-help-text">
                  Add the article content as sections below.
                </p>
              </div>

              <div className="admin-section-actions">
                <button className="admin-secondary" type="button" onClick={() => addSection('paragraph')}>
                  Add Paragraph
                </button>
                <button className="admin-secondary" type="button" onClick={() => addSection('list')}>
                  Add List
                </button>
                <button className="admin-secondary" type="button" onClick={() => addSection('venue-list')}>
                  Add Venue List
                </button>
              </div>
            </div>

            {formData.sections.length === 0 && (
              <p className="admin-empty-note">No extra sections yet. Add one above.</p>
            )}

            {formData.sections.map((section, index) => (
              <div className="section-editor-card" key={section.id}>
                <div className="section-editor-top">
                  <strong>Section {index + 1}</strong>
                  <button
                    className="admin-delete-btn"
                    type="button"
                    onClick={() => removeSection(section.id)}
                  >
                    Remove
                  </button>
                </div>

                <div className="admin-field">
                  <label htmlFor={`section-type-${section.id}`}>Type</label>
                  <select
                    id={`section-type-${section.id}`}
                    value={section.type}
                    onChange={(event) => updateSection(section.id, 'type', event.target.value)}
                  >
                    <option value="paragraph">Paragraph</option>
                    <option value="list">List</option>
                    <option value="venue-list">Venue List</option>
                  </select>
                </div>

                <div className="admin-field">
                  <label htmlFor={`section-title-${section.id}`}>Section Title</label>
                  <input
                    id={`section-title-${section.id}`}
                    type="text"
                    value={section.title}
                    onChange={(event) => updateSection(section.id, 'title', event.target.value)}
                    placeholder="Optional title"
                  />
                </div>

                {section.type === 'paragraph' && (
                  <div className="admin-field admin-field-wide">
                    <label htmlFor={`section-text-${section.id}`}>Paragraph Text</label>
                    <textarea
                      id={`section-text-${section.id}`}
                      value={section.text}
                      onChange={(event) => updateSection(section.id, 'text', event.target.value)}
                      placeholder="Write the paragraph text here"
                    />
                  </div>
                )}

                {section.type === 'list' && (
                  <div className="admin-field admin-field-wide">
                    <label htmlFor={`section-items-${section.id}`}>List Items</label>
                    <textarea
                      id={`section-items-${section.id}`}
                      value={section.itemsText}
                      onChange={(event) => updateSection(section.id, 'itemsText', event.target.value)}
                      placeholder="One item per line"
                    />
                  </div>
                )}

                {section.type === 'venue-list' && (
                  <div className="admin-field admin-field-wide">
                    <label htmlFor={`section-venues-${section.id}`}>Venue Rows</label>
                    <textarea
                      id={`section-venues-${section.id}`}
                      value={section.venueRowsText}
                      onChange={(event) => updateSection(section.id, 'venueRowsText', event.target.value)}
                      placeholder="Name | Rating | Subtitle | Address | Highlight\nOne venue per line"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="admin-actions">
            <button className="admin-primary" type="submit">
              {editingItemId ? 'Save Changes' : 'Publish News'}
            </button>
            {editingItemId && (
              <button className="admin-secondary" type="button" onClick={resetForm}>
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </section>

      <div className="news-list admin-news-list">
        {sortedNewsItems.map((item) => (
          <article className="news-card" key={item.id}>
            <div className="news-header">
              <span className="date">{item.date}</span>
            </div>

            <h2>{item.title}</h2>
            <p className="description">{item.description}</p>

            {expandedItemId === item.id && (
              <div className="news-details">
                <p className="item-details">{item.details}</p>
                {item.editedNote && <p className="item-edited-note">{item.editedNote}</p>}

                {/* Render structured sections from backend (paragraph, list, venue-list) */}
                {(item.sections || []).map((section, si) => renderSection(section, si))}
              </div>
            )}

            <div className="admin-card-actions">
              <button
                className="read-more"
                type="button"
                onClick={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
                aria-expanded={expandedItemId === item.id}
              >
                {expandedItemId === item.id ? 'Show Less' : 'Read More'}
              </button>
              <button className="admin-edit-btn" type="button" onClick={() => handleEdit(item)}>
                Edit
              </button>
              <button className="admin-delete-btn" type="button" onClick={() => handleDelete(item.id)}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
      <Footer />
    </main>
  );
}
