import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import { getUserRole } from "../services/auth";
import "../styles/CommunityPage.css";

export default function CommunityPage() {
	const navigate = useNavigate();
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const [reviews, setReviews] = useState([]);
	const [restaurants, setRestaurants] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [showReviewDialog, setShowReviewDialog] = useState(false);
	const [restaurantSearch, setRestaurantSearch] = useState("");
	const [showRestaurantDropdown, setShowRestaurantDropdown] = useState(false);
	const [filteredRestaurants, setFilteredRestaurants] = useState([]);
	const [reviewForm, setReviewForm] = useState({
		restaurantName: "",
		restaurantId: null,
		rating: 0,
		comment: "",
		attachments: [],
	});
	const [reportDialog, setReportDialog] = useState(null);
	const [reportReason, setReportReason] = useState("");
	const [userLikes, setUserLikes] = useState({});
	const [lightboxPhotos, setLightboxPhotos] = useState([]);
	const [lightboxIndex, setLightboxIndex] = useState(0);
	const isRegisteredUser = getUserRole() === "user";

	const handleLogout = () => {
		localStorage.removeItem("token");
		localStorage.removeItem("user");
		window.location.href = "/login";
	};

	const menuItems = [
		{ label: 'Profile', to: '/profile' },
		{ label: 'Feedback', to: '/feedback' },
		{ label: 'Community', to: '/community' },
		{ label: 'Log In / Register', to: '/login' },
	];

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

	const userId = isRegisteredUser ? (localStorage.getItem("userId") || "user_temp") : "user_temp";
	const username = isRegisteredUser ? (localStorage.getItem("username") || localStorage.getItem("userFullName") || "Anonymous") : "Anonymous";

	useEffect(() => {
		fetchAllReviews();
		fetchAllRestaurants();
	}, []);

	// Handle Escape key to close lightbox
	useEffect(() => {
		const handleEscape = (e) => {
			if (e.key === "Escape") {
				setLightboxPhotos([]);
				setLightboxIndex(0);
			}
			if (e.key === "ArrowLeft") {
				setLightboxIndex((prev) => {
					if (lightboxPhotos.length <= 1) {
						return prev;
					}
					return prev === 0 ? lightboxPhotos.length - 1 : prev - 1;
				});
			}
			if (e.key === "ArrowRight") {
				setLightboxIndex((prev) => {
					if (lightboxPhotos.length <= 1) {
						return prev;
					}
					return prev === lightboxPhotos.length - 1 ? 0 : prev + 1;
				});
			}
		};
		if (lightboxPhotos.length > 0) {
			window.addEventListener("keydown", handleEscape);
			return () => window.removeEventListener("keydown", handleEscape);
		}
	}, [lightboxPhotos.length]);

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
		setLightboxIndex((prev) => {
			if (lightboxPhotos.length <= 1) {
				return prev;
			}
			return prev === 0 ? lightboxPhotos.length - 1 : prev - 1;
		});
	};

	const showNextPhoto = () => {
		setLightboxIndex((prev) => {
			if (lightboxPhotos.length <= 1) {
				return prev;
			}
			return prev === lightboxPhotos.length - 1 ? 0 : prev + 1;
		});
	};

	const fetchAllReviews = async () => {
		try {
			setLoading(true);
			const response = await api.get("/reviews");
			if (response.data.success) {
				const normalizedReviews = response.data.reviews.map((review) => normalizeReview(review));
				setReviews(normalizedReviews);
				// Initialize user likes/dislikes
				const likes = {};
				normalizedReviews.forEach((review) => {
					likes[review.id] = {
						liked: review.likes?.includes(userId),
						disliked: review.dislikes?.includes(userId),
					};
				});
				setUserLikes(likes);
			}
		} catch (err) {
			console.error("Error fetching reviews:", err);
		} finally {
			setLoading(false);
		}
	};

	const fetchAllRestaurants = async () => {
		try {
			const response = await api.get("/restaurants");
			if (response.data.success) {
				setRestaurants(response.data.restaurants || []);
			} else {
				setRestaurants([]);
			}
		} catch (err) {
			console.error("Error fetching restaurants:", err);
			setRestaurants([]);
		}
	};

	const handleFileChange = (e) => {
		const files = Array.from(e.target.files);
		setReviewForm((prev) => ({
			...prev,
			attachments: [...prev.attachments, ...files],
		}));
		e.target.value = "";
	};

	const handleRestaurantSearch = (value) => {
		setRestaurantSearch(value);
		if (value.trim()) {
			const filtered = restaurants.filter((restaurant) =>
				restaurant.name.toLowerCase().includes(value.toLowerCase())
			);
			setFilteredRestaurants(filtered);
			setShowRestaurantDropdown(true);
		} else {
			setFilteredRestaurants(restaurants);
			setShowRestaurantDropdown(false);
		}
	};

	const handleSelectRestaurant = (restaurant) => {
		setReviewForm((prev) => ({
			...prev,
			restaurantName: restaurant.name,
			restaurantId: restaurant.id || restaurant._id,
		}));
		setRestaurantSearch(restaurant.name);
		setShowRestaurantDropdown(false);
	};

	const handleSubmitReview = async (e) => {
		e.preventDefault();
		setError("");
		setSuccess("");

		if (!isRegisteredUser) {
			setError("Please log in as a registered user to post reviews.");
			navigate("/login");
			return;
		}

		if (!reviewForm.restaurantName.trim() || !reviewForm.comment.trim() || reviewForm.rating === 0) {
			setError("Please fill in all required fields");
			return;
		}

		try {
			setLoading(true);
			const formData = new FormData();
			formData.append("userId", userId);
			formData.append("username", username);
			formData.append("restaurantId", reviewForm.restaurantId || "restaurant_temp");
			formData.append("restaurantName", reviewForm.restaurantName);
			formData.append("rating", reviewForm.rating);
			formData.append("comment", reviewForm.comment);

			reviewForm.attachments.forEach((file) => {
				formData.append("attachments", file);
			});

			const response = await api.post("/reviews", formData, {
				headers: { "Content-Type": "multipart/form-data" },
			});

			if (response.data.success) {
				setSuccess("Review posted successfully!");
				setShowReviewDialog(false);
				setReviewForm({ restaurantName: "", restaurantId: null, rating: 0, comment: "", attachments: [] });
				setRestaurantSearch("");
				fetchAllReviews();
				setTimeout(() => setSuccess(""), 3000);
			}
		} catch (err) {
			setError(err.response?.data?.message || "Error posting review");
			console.error("Error posting review:", err);
		} finally {
			setLoading(false);
		}
	};

	const handleLike = async (reviewId) => {
		if (!isRegisteredUser) {
			navigate("/login");
			return;
		}

		try {
			const response = await api.post(`/reviews/${reviewId}/like`, { userId });
			if (response.data.success) {
				setUserLikes((prev) => ({
					...prev,
					[reviewId]: { liked: true, disliked: false },
				}));
				fetchAllReviews();
			}
		} catch (err) {
			console.error("Error liking review:", err);
		}
	};

	const handleDislike = async (reviewId) => {
		if (!isRegisteredUser) {
			navigate("/login");
			return;
		}

		try {
			const response = await api.post(`/reviews/${reviewId}/dislike`, { userId });
			if (response.data.success) {
				setUserLikes((prev) => ({
					...prev,
					[reviewId]: { liked: false, disliked: true },
				}));
				fetchAllReviews();
			}
		} catch (err) {
			console.error("Error disliking review:", err);
		}
	};

	const handleReportSubmit = async () => {
		if (!isRegisteredUser) {
			navigate("/login");
			return;
		}

		if (!reportReason.trim()) {
			setError("Please provide a reason for reporting");
			return;
		}

		const reviewToReport = reviews.find((review) => review.id === reportDialog);
		if (!reviewToReport) {
			setError("Review not found");
			return;
		}

		if (reviewToReport.userId === userId) {
			setError("You cannot report your own review");
			return;
		}

		try {
			const response = await api.post(`/reviews/${reportDialog}/report`, {
				userId,
				reason: reportReason,
			});

			if (response.data.success) {
				setSuccess("Review reported successfully. Thank you for helping keep our community safe!");
				setReportDialog(null);
				setReportReason("");
				setTimeout(() => setSuccess(""), 3000);
			}
		} catch (err) {
			setError(err.response?.data?.message || "Error reporting review");
			console.error("Error reporting review:", err);
		}
	};

	const handleDeleteReview = async (reviewId) => {
		const reviewToDelete = reviews.find((review) => review.id === reviewId);
		if (!reviewToDelete) {
			setError("Review not found");
			return;
		}

		if (reviewToDelete.userId !== userId) {
			setError("You can only delete your own review");
			return;
		}

		const confirmed = window.confirm("Delete this review? This cannot be undone.");
		if (!confirmed) {
			return;
		}

		try {
			setLoading(true);
			const response = await api.delete(`/reviews/${reviewId}`, {
				data: { userId },
			});

			if (response.data.success) {
				setSuccess("Your review has been deleted.");
				fetchAllReviews();
				setTimeout(() => setSuccess(""), 3000);
			}
		} catch (err) {
			setError(err.response?.data?.message || "Error deleting review");
			console.error("Error deleting review:", err);
		} finally {
			setLoading(false);
		}
	};

	const formatDate = (dateString) => {
		const date = new Date(dateString);
		return date.toLocaleString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const handleNavigateToRestaurant = (restaurantId, restaurantName) => {
		navigate(`/restaurant/${restaurantId}`, { state: { restaurantName } });
	};

	return (
		<div className="community-page-wrapper">

			<Header title="Community Reviews" subtitle="Share and read restaurant reviews from our community" isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

			<Sidebar
				isSidebarOpen={isSidebarOpen}
				setIsSidebarOpen={setIsSidebarOpen}
				handleLogout={handleLogout}
				menuItems={menuItems}
			/>

			<main className="community-container">
				{success && <div className="alert alert-success">{success}</div>}
				{error && <div className="alert alert-error">{error}</div>}

				{/* Write Review Button */}
				<div className="write-review-section">
					<button
						className="btn-write-review"
						onClick={() => (isRegisteredUser ? setShowReviewDialog(true) : navigate("/login"))}
						disabled={loading}
					>
						✏️ Write a Review
					</button>
				</div>

				{/* Review Dialog */}
				{showReviewDialog && (
					<div className="review-dialog-overlay" onClick={() => setShowReviewDialog(false)}>
						<div className="review-dialog" onClick={(e) => e.stopPropagation()}>
							<div className="review-dialog-header">
								<h2>Write a Review</h2>
								<button
									className="btn-close"
									onClick={() => setShowReviewDialog(false)}
								>
									×
								</button>
							</div>

							<form onSubmit={handleSubmitReview} className="review-form">
								<div className="form-group">
									<label htmlFor="restaurantName">Restaurant Name*</label>
									<div className="restaurant-search-container">
										<input
											id="restaurantName"
											type="text"
											value={restaurantSearch}
											onChange={(e) => handleRestaurantSearch(e.target.value)}
											onFocus={() => {
												setShowRestaurantDropdown(true);
												if (!filteredRestaurants.length) {
													setFilteredRestaurants(restaurants);
												}
											}}
											placeholder="Search restaurants..."
											disabled={loading}
											className="form-input restaurant-search-input"
											autoComplete="off"
										/>
										{showRestaurantDropdown && (
											<div className="restaurant-dropdown">
												{filteredRestaurants.length > 0 ? (
													filteredRestaurants.map((restaurant) => (
														<div
															key={restaurant.id || restaurant._id}
															className="restaurant-option"
															onClick={() => handleSelectRestaurant(restaurant)}
														>
															📍 {restaurant.name}
														</div>
													))
												) : (
													<div className="restaurant-no-result">
														No restaurants found
													</div>
												)}
											</div>
										)}
									</div>
								</div>

								<div className="form-group">
									<label>Rating*</label>
									<div className="review-stars">
										{[1, 2, 3, 4, 5].map((star) => (
											<button
												key={star}
												type="button"
												className={`star-btn ${
													star <= reviewForm.rating ? "active" : ""
												}`}
												onClick={() =>
													setReviewForm((prev) => ({
														...prev,
														rating: star,
													}))
												}
												disabled={loading}
											>
												★
											</button>
										))}
									</div>
									<span className="rating-text">
										{reviewForm.rating > 0
											? ["Poor", "Fair", "Good", "Very Good", "Excellent"][
													reviewForm.rating - 1
												]
											: "Click to rate"}
									</span>
								</div>

								<div className="form-group">
									<label htmlFor="comment">Your Review*</label>
									<textarea
										id="comment"
										value={reviewForm.comment}
										onChange={(e) =>
											setReviewForm((prev) => ({
												...prev,
												comment: e.target.value,
											}))
										}
										placeholder="Share your experience at this restaurant..."
										disabled={loading}
										className="form-textarea"
										rows="5"
									/>
								</div>

								<div className="form-group">
									<label htmlFor="photos">Photos (Optional)</label>
									<div className="file-upload">
										<label htmlFor="photos" className="file-upload-label">
											<span className="file-upload-btn">Upload Photos</span>
											<span className="file-upload-text">
												{reviewForm.attachments.length > 0
													? `${reviewForm.attachments.length} file(s) selected`
													: "Click to select photos"}
											</span>
										</label>
										<input
											id="photos"
											type="file"
											multiple
											onChange={handleFileChange}
											disabled={loading}
											className="file-input-hidden"
											accept="image/*"
										/>
									</div>

									{reviewForm.attachments.length > 0 && (
										<div className="attachments-preview">
											{reviewForm.attachments.map((file, idx) => (
												<div key={idx} className="attachment-item">
													<span>{file.name}</span>
													<button
														type="button"
														className="btn-remove"
														onClick={() =>
															setReviewForm((prev) => ({
																...prev,
																attachments: prev.attachments.filter(
																	(_, i) => i !== idx
																),
															}))
														}
													>
														Remove
													</button>
												</div>
											))}
										</div>
									)}
								</div>

								<div className="review-dialog-actions">
									<button
										type="button"
										className="btn-cancel"
										onClick={() => setShowReviewDialog(false)}
										disabled={loading}
									>
										Cancel
									</button>
									<button
										type="submit"
										className="btn-submit"
										disabled={loading || reviewForm.rating === 0}
									>
										{loading ? "Posting..." : "Post Review"}
									</button>
								</div>
							</form>
						</div>
					</div>
				)}

				{/* Reviews List */}
				{loading && reviews.length === 0 ? (
					<div className="reviews-section">
						<p style={{ textAlign: "center", color: "#61707D" }}>Loading reviews...</p>
					</div>
				) : reviews.length === 0 ? (
					<div className="reviews-section">
						<div className="no-reviews">
							<p>No reviews yet. Be the first to share your experience!</p>
						</div>
					</div>
				) : (
					<div className="reviews-section">
						<h2>Community Reviews ({reviews.length})</h2>
						<div className="reviews-list">
							{reviews.map((review) => {
								const isOwnReview = review.userId === userId;

								return (
									<div key={review.id} className="review-card">
										{/* Review Header */}
										<div className="review-header">
											<div className="review-user-info">
												<strong className="review-username">{review.username}</strong>
												<span className={`review-owner-badge ${isOwnReview ? "own" : "other"}`}>
													{isOwnReview ? "Your post" : "Community post"}
												</span>
												<span className="review-date">{formatDate(review.createdAt)}</span>
											</div>
											<div className="review-actions-menu">
												{isOwnReview ? (
													<button
														className="btn-delete"
														onClick={() => handleDeleteReview(review.id)}
														disabled={loading}
														title="Delete your review"
													>
														Delete
													</button>
												) : (
													<button
														className="btn-report"
														onClick={() => (isRegisteredUser ? setReportDialog(review.id) : navigate("/login"))}
														title="Report this review"
														disabled={loading}
													>
														Report
													</button>
												)}
											</div>
										</div>

										{/* Restaurant Link */}
										<button
											className="restaurant-link"
											onClick={() =>
												handleNavigateToRestaurant(
													review.restaurantId,
													review.restaurantName
												)
											}
										>
											📍 {review.restaurantName}
										</button>

										{/* Rating */}
										<div className="review-rating">
											{[1, 2, 3, 4, 5].map((star) => (
												<span key={star} className="rating-star">
													{star <= review.rating ? "★" : "☆"}
												</span>
											))}
											<span className="rating-label">
												{["Poor", "Fair", "Good", "Very Good", "Excellent"][review.rating - 1]}
											</span>
										</div>

										{/* Comment */}
										<p className="review-comment">{review.comment}</p>

										{/* Photos */}
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

										{/* Like/Dislike */}
										<div className="review-actions">
											<button
												className={`btn-like ${userLikes[review.id]?.liked ? "active" : ""}`}
												type="button"
												onClick={() => (isRegisteredUser ? handleLike(review.id) : navigate("/login"))}
												disabled={loading}
											>
												👍 Helpful ({Array.isArray(review.likes) ? review.likes.length : 0})
											</button>
											<button
												className={`btn-dislike ${userLikes[review.id]?.disliked ? "active" : ""}`}
												type="button"
												onClick={() => (isRegisteredUser ? handleDislike(review.id) : navigate("/login"))}
												disabled={loading}
											>
												👎 Not Helpful ({Array.isArray(review.dislikes) ? review.dislikes.length : 0})
											</button>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}

				{/* Report Dialog */}
				{reportDialog && (
					<div className="report-dialog-overlay" onClick={() => setReportDialog(null)}>
						<div className="report-dialog" onClick={(e) => e.stopPropagation()}>
							<div className="report-dialog-header">
								<h2>Report Review</h2>
								<button
									className="btn-close"
									onClick={() => setReportDialog(null)}
								>
									×
								</button>
							</div>

							<div className="report-dialog-content">
								<p>Why are you reporting this review?</p>
								<div className="form-group">
									<select
										value={reportReason}
										onChange={(e) => setReportReason(e.target.value)}
										className="form-select"
									>
										<option value="">Select a reason...</option>
										<option value="inappropriate-content">Inappropriate Content</option>
										<option value="offensive-language">Offensive Language</option>
										<option value="spam">Spam</option>
										<option value="fake-review">Fake Review</option>
										<option value="personal-attack">Personal Attack</option>
										<option value="other">Other</option>
									</select>
								</div>

								<div className="report-dialog-actions">
									<button
										className="btn-cancel"
										onClick={() => setReportDialog(null)}
									>
										Cancel
									</button>
									<button
										className="btn-submit"
										onClick={handleReportSubmit}
										disabled={!reportReason || loading}
									>
										Report
									</button>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Lightbox Modal */}
				{lightboxPhotos.length > 0 && (
					<div className="lightbox-overlay" onClick={closeLightbox}>
						<div className="lightbox-container" onClick={(e) => e.stopPropagation()}>
							<button
								className="lightbox-close"
								onClick={closeLightbox}
								title="Close (Esc)"
							>
								✕
							</button>
							{lightboxPhotos.length > 1 && (
								<>
									<button
										className="lightbox-nav lightbox-nav-prev"
										onClick={showPreviousPhoto}
										title="Previous photo"
									>
										‹
									</button>
									<button
										className="lightbox-nav lightbox-nav-next"
										onClick={showNextPhoto}
										title="Next photo"
									>
										›
									</button>
								</>
							)}
							<img
								src={lightboxPhotos[lightboxIndex]?.src}
								alt={lightboxPhotos[lightboxIndex]?.alt || "Full view"}
								className="lightbox-image"
							/>
							{lightboxPhotos.length > 1 && (
								<div className="lightbox-counter">
									{lightboxIndex + 1} / {lightboxPhotos.length}
								</div>
							)}
						</div>
					</div>
				)}
			</main>
			<Footer />
		</div>
	);
}
