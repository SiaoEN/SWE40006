import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import "../styles/CommunityPageAdmin.css";

export default function CommunityPageAdmin() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reviewFilter, setReviewFilter] = useState("reported");

  // Lightbox gallery
  const [lightboxPhotos, setLightboxPhotos] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const getReviewKey = (review) => {
    const rawId = review?.id || review?._id || (review?._id && (review._id.$oid || String(review._id)));
    return rawId ? String(rawId) : "";
  };

  const normalizeReview = (review) => {
    if (!review) return null;
    return {
      ...review,
      id: getReviewKey(review),
      likes: Array.isArray(review.likes) ? review.likes : [],
      dislikes: Array.isArray(review.dislikes) ? review.dislikes : [],
      reports: Array.isArray(review.reports) ? review.reports : [],
    };
  };

  const adminId = localStorage.getItem("userId") || "admin_temp";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const adminMenuItems = [
    { label: 'Profile', to: '/admin/profile' },
  ];

  useEffect(() => {
    fetchAllReviews();
  }, []);

  const fetchAllReviews = async () => {
    try {
      setLoading(true);
      const response = await api.get("/reviews");
      if (response.data && response.data.success) {
        setReviews((response.data.reviews || []).map((review) => normalizeReview(review)));
      }
    } catch (err) {
      console.error(err);
      setError("Error fetching reviews");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (reviewId) => {
    if (!confirm("Delete this review? This action cannot be undone.")) return;
    try {
      setLoading(true);
      await api.delete(`/reviews/${reviewId}`, { data: { userId: adminId, isAdmin: true } });
      setSuccess("Review deleted");
      fetchAllReviews();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Error deleting review");
    } finally {
      setLoading(false);
    }
  };

  const handleClearReports = async (reviewId) => {
    if (!confirm("Mark reports as reviewed for this review?")) return;
    try {
      setLoading(true);
      await api.post(`/reviews/${reviewId}/clear-reports`, { isAdmin: true });
      setSuccess("Reports cleared");
      fetchAllReviews();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Error clearing reports");
    } finally {
      setLoading(false);
    }
  };

  // Lightbox controls
  const openLightbox = (attachments, index) => {
    const photos = attachments.map((att) => ({
      src: `http://localhost:5000/uploads/feedback/${att.filename}`,
      alt: att.originalName || att.filename,
    }));
    setLightboxPhotos(photos);
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxPhotos([]);
    setLightboxIndex(0);
  };

  const showPreviousPhoto = () => {
    setLightboxIndex((prev) => (lightboxPhotos.length <= 1 ? prev : prev === 0 ? lightboxPhotos.length - 1 : prev - 1));
  };

  const showNextPhoto = () => {
    setLightboxIndex((prev) =>
      lightboxPhotos.length <= 1 ? prev : prev === lightboxPhotos.length - 1 ? 0 : prev + 1
    );
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") showPreviousPhoto();
      if (e.key === "ArrowRight") showNextPhoto();
    };
    if (lightboxPhotos.length > 0) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxPhotos.length]);

  const reported = reviews.filter((r) => r.reports && r.reports.length > 0);
  const totalReviews = reviews.length;
  const reportedCount = reported.length;
  const visibleReviews = reviewFilter === "reported" ? reported : reviews;

  return (
    <div className="community-admin-page">
      <Header
        title="Admin Community Monitoring"
        subtitle="View user posted reviews and manage user reportedreviews"
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        bellTo="/admin/news"
        notificationMode="navigate"
      />

      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        handleLogout={handleLogout}
        menuItems={adminMenuItems}
        profileTo="/admin/profile"
      />


      <main className="community-container">
        <section className="reviews-section">
          <div className="review-filter-bar" role="tablist" aria-label="Review filters">
            <button
              type="button"
              className={`review-filter-btn ${reviewFilter === "reported" ? "active" : ""}`}
              onClick={() => setReviewFilter("reported")}
            >
              <span className="review-filter-icon" aria-hidden="true">⚠</span>
              Reported Reviews <span className="review-filter-count">{reportedCount}</span>
            </button>
            <button
              type="button"
              className={`review-filter-btn ${reviewFilter === "all" ? "active" : ""}`}
              onClick={() => setReviewFilter("all")}
            >
              All Reviews <span className="review-filter-count">{totalReviews}</span>
            </button>
          </div>

          <h2>{reviewFilter === "reported" ? "Reported Reviews" : "All Reviews"}</h2>
          {loading && <p>Loading...</p>}
          {!loading && visibleReviews.length === 0 && (
            <p>{reviewFilter === "reported" ? "No reported reviews." : "No reviews available."}</p>
          )}

        <div className="reviews-list">
          {visibleReviews.map((review) => {
            const isReported = (review.reports?.length || 0) > 0;
            const reviewId = review.id || getReviewKey(review);

            return (
            <div key={reviewId} className={`review-card ${isReported ? "review-card--reported" : ""}`}>
              <div className="review-header">
                <div className="review-user-info">
                  {isReported && (
                    <span className="review-alert-badge" title="This review has been reported" aria-label="Reported review">
                      ⚠
                    </span>
                  )}
                  <strong>{review.username}</strong>
                  <span className="muted">· {new Date(review.createdAt).toLocaleString()}</span>
                </div>
                <div className="review-actions-menu">
                  {isReported && (
                    <button className="btn-report" type="button" onClick={() => handleClearReports(reviewId)} disabled={loading}>
                      Mark Reviewed
                    </button>
                  )}
                  <button className="btn-delete" type="button" onClick={() => handleDelete(reviewId)} disabled={loading}>
                    Delete
                  </button>
                </div>
              </div>

              <div className="review-rating">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="rating-star">{i < review.rating ? '★' : '☆'}</span>
                ))}
              </div>

              <p className="review-restaurant">
                <strong>Restaurant:</strong> {review.restaurantName || "Unknown restaurant"}
              </p>

              <p className="review-comment">{review.comment}</p>

              {review.attachments && review.attachments.length > 0 && (
                <div className="review-attachments">
                  {review.attachments.map((att, idx) => (
                    <img
                      key={idx}
                      src={`http://localhost:5000/uploads/feedback/${att.filename}`}
                      alt={att.originalName || att.filename}
                      className="review-photo"
                      onClick={() => openLightbox(review.attachments, idx)}
                    />
                  ))}
                </div>
              )}
            </div>
            );
          })}
        </div>
        </section>

      {/* Lightbox Modal */}
      {lightboxPhotos.length > 0 && (
        <div className="lightbox-overlay" onClick={closeLightbox}>
          <div className="lightbox-container" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={closeLightbox} title="Close (Esc)">✕</button>
            {lightboxPhotos.length > 1 && (
              <>
                <button className="lightbox-nav lightbox-nav-prev" onClick={showPreviousPhoto} title="Previous photo">‹</button>
                <button className="lightbox-nav lightbox-nav-next" onClick={showNextPhoto} title="Next photo">›</button>
              </>
            )}
            <img src={lightboxPhotos[lightboxIndex]?.src} alt={lightboxPhotos[lightboxIndex]?.alt || "Full view"} className="lightbox-image" />
            {lightboxPhotos.length > 1 && <div className="lightbox-counter">{lightboxIndex + 1} / {lightboxPhotos.length}</div>}
          </div>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      </main>

      <Footer />
    </div>
  );
}
