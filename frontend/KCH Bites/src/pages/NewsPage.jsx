import { useEffect, useMemo, useState } from 'react';
import '../styles/NewsPage.css';

function formatPublishedDate(value) {
  if (!value) {
    return '';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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
  const sectionKey = section.id || `section-${index}`;

  if (section.type === 'list') {
    return (
      <div className="news-section" key={sectionKey}>
        {section.title && <h4 className="news-section-title">{section.title}</h4>}
        <ul className="restaurant-list">
          {(section.items || []).map((entry, itemIndex) => (
            <li key={`${sectionKey}-item-${itemIndex}`} className="restaurant-item">
              <div className="rest-meta">{entry}</div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (section.type === 'venue-list') {
    return renderVenueList({
      ...section,
      id: sectionKey,
      items: Array.isArray(section.items) ? section.items : [],
    });
  }

  return (
    <div className="news-section" key={sectionKey}>
      {section.title && <h4 className="news-section-title">{section.title}</h4>}
      {section.text && <p className="item-details">{section.text}</p>}
    </div>
  );
}

export default function NewsPage() {
  const [newsItems, setNewsItems] = useState([]);
  const [expandedItemId, setExpandedItemId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function fetchNews() {
      try {
        setIsLoading(true);
        setErrorMessage('');

        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${baseUrl.replace(/\/$/, '')}/news`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();
        const loadedNews = Array.isArray(data?.news)
          ? data.news
          : [];

        setNewsItems(loadedNews);
      } catch (_error) {
        setErrorMessage('Unable to load news right now. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchNews();
  }, []);

  const sortedNewsItems = useMemo(
    () =>
      [...newsItems].sort(
        (left, right) => new Date(right.publishedAt) - new Date(left.publishedAt)
      ),
    [newsItems]
  );

  return (
    <main className="news-page">
      <div className="news-hero">
        <h2 className="news-title">Food News in Kuching</h2>
        <p className="subtitle">
          Stay updated with the latest restaurant trends and openings.
        </p>
      </div>

      {isLoading && <p className="description">Loading latest news...</p>}
      {errorMessage && <p className="description">{errorMessage}</p>}

      {!isLoading && !errorMessage && sortedNewsItems.length === 0 && (
        <p className="description">No news has been published yet.</p>
      )}

      {!isLoading && !errorMessage && sortedNewsItems.length > 0 && (
        <div className="news-list">
          {sortedNewsItems.map((item) => (
            <article className="news-card" key={item.id}>
              <div className="news-header">
                <span className="date">{formatPublishedDate(item.publishedAt)}</span>
              </div>

              <h2>{item.title}</h2>
              <p className="description">{item.summary}</p>

              {expandedItemId === item.id && (
                <div className="news-details">
                  {(item.sections || []).map((section, index) =>
                    renderSection(section, index)
                  )}
                </div>
              )}

              <button
                className="read-more"
                type="button"
                onClick={() =>
                  setExpandedItemId(expandedItemId === item.id ? null : item.id)
                }
                aria-expanded={expandedItemId === item.id}
              >
                {expandedItemId === item.id ? 'Show Less' : 'Read More'}
              </button>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
