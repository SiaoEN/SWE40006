import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import "../styles/CommunityPage.css";
import "../styles/RestaurantPage.css";

const ratingLabels = ["Poor", "Fair", "Good", "Very Good", "Excellent"];

export default function RestaurantPage() {
	const navigate = useNavigate();
	const location = useLocation();
	const { restaurantId } = useParams();
	const openedFromAdmin = Boolean(location.state?.fromAdmin);
	const backPath = openedFromAdmin ? "/admin/restaurant" : "/main";
	const backLabel = openedFromAdmin ? "Back" : "Back to main";

	const userId = localStorage.getItem("userId") || "user_temp";
	const username = localStorage.getItem("username") || localStorage.getItem("userFullName") || "Anonymous";

	const [restaurant, setRestaurant] = useState(location.state?.restaurant || null);
	const [restaurantLoading, setRestaurantLoading] = useState(!location.state?.restaurant);
	const [reviews, setReviews] = useState([]);
	const [reviewsLoading, setReviewsLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [showReviewDialog, setShowReviewDialog] = useState(false);
	const [reviewForm, setReviewForm] = useState({ rating: 0, comment: "", attachments: [] });
	const [lightboxPhotos, setLightboxPhotos] = useState([]);
	const [lightboxIndex, setLightboxIndex] = useState(0);
	const [lightboxZoom, setLightboxZoom] = useState(1);
	const reviewActionLabel = openedFromAdmin ? "View all reviews" : "Write a Review";

	// Fetch restaurant by ID if not provided via navigation state
	useEffect(() => {
		if (location.state?.restaurant) return;

		async function fetchRestaurant() {
			try {
				setRestaurantLoading(true);
				const response = await api.get(`/restaurants/${restaurantId}`);
				if (response.data.success) {
					setRestaurant(response.data.restaurant);
				} else {
					setRestaurant(null);
				}
				setError("");
			} catch (err) {
				console.error("Error fetching restaurant:", err);
				setError("Failed to load restaurant details.");
				setRestaurant(null);
			} finally {
				setRestaurantLoading(false);
			}
		}

		fetchRestaurant();
	}, [restaurantId, location.state?.restaurant]);
	const restaurantPhotos = useMemo(() => {
		const rawPhotos = restaurant?.images?.length
			? restaurant.images
			: restaurant?.photos?.length
				? restaurant.photos
				: [];

		return rawPhotos
			.map((photo, index) => {
				if (typeof photo === "string") {
					return {
						src: photo,
						alt: `${restaurant?.name || "Restaurant"} photo ${index + 1}`,
					};
				}

				const resolvedSrc =
					photo?.src ||
					photo?.url ||
					photo?.path ||
					(photo?.filename ? `http://localhost:5000/uploads/feedback/${photo.filename}` : "");

				if (!resolvedSrc) {
					return null;
				}

				return {
					...photo,
					src: resolvedSrc,
					alt: photo?.alt || photo?.originalName || `${restaurant?.name || "Restaurant"} photo ${index + 1}`,
				};
			})
			.filter(Boolean);
	}, [restaurant]);
	const restaurantPreviewPhotos = useMemo(() => {
		if (restaurantPhotos.length === 0) {
			return [];
		}

		return restaurantPhotos.slice(0, 3).map((photo, index) => ({
			...photo,
			lightboxIndex: index,
		}));
	}, [restaurantPhotos]);

	const operatingHoursText = useMemo(() => {
		if (!restaurant?.operatingHours) {
			return "-";
		}

		if (typeof restaurant.operatingHours === "string") {
			const rows = restaurant.operatingHours
				.split("|")
				.map((entry) => entry.trim())
				.filter(Boolean);

			return rows.length > 0 ? rows.join("\n") : restaurant.operatingHours;
		}

		if (typeof restaurant.operatingHours === "object") {
			const entries = Object.entries(restaurant.operatingHours)
				.map(([day, hours]) => {
					if (typeof hours === "string") {
						const trimmedHours = hours.trim();
						return trimmedHours ? `${day}: ${trimmedHours}` : null;
					}

					if (hours?.closed) {
						return `${day}: Closed`;
					}

					if (hours?.start && hours?.end) {
						return `${day}: ${hours.start}-${hours.end}`;
					}

					return null;
				})
				.filter(Boolean);

			return entries.length > 0 ? entries.join("\n") : "-";
		}

		return "-";
	}, [restaurant?.operatingHours]);

	useEffect(() => {
		if (!restaurantId) {
			return;
		}

		const fetchRestaurantReviews = async () => {
			try {
				setReviewsLoading(true);
				const response = await api.get(`/reviews/restaurant/${restaurantId}`);
				if (response.data.success) {
					setReviews(response.data.reviews);
				}
			} catch (err) {
				console.error("Error fetching restaurant reviews:", err);
				setError("Could not load restaurant reviews");
			} finally {
				setReviewsLoading(false);
			}
		};

		fetchRestaurantReviews();
	}, [restaurantId]);

	useEffect(() => {
		const handleEscape = (event) => {
			if (event.key === "Escape") {
				setLightboxPhotos([]);
				setLightboxIndex(0);
				setLightboxZoom(1);
			}
			if (event.key === "ArrowLeft" && lightboxPhotos.length > 0) {
				setLightboxIndex((prev) => (lightboxPhotos.length <= 1 ? prev : prev === 0 ? lightboxPhotos.length - 1 : prev - 1));
				setLightboxZoom(1);
			}
			if (event.key === "ArrowRight" && lightboxPhotos.length > 0) {
				setLightboxIndex((prev) => (lightboxPhotos.length <= 1 ? prev : prev === lightboxPhotos.length - 1 ? 0 : prev + 1));
				setLightboxZoom(1);
			}
			if ((event.key === "+" || event.key === "=") && lightboxPhotos.length > 0) {
				setLightboxZoom((prev) => Math.min(prev + 0.25, 3));
			}
			if ((event.key === "-" || event.key === "_") && lightboxPhotos.length > 0) {
				setLightboxZoom((prev) => Math.max(prev - 0.25, 0.5));
			}
		};

		const handleWheel = (event) => {
			if (lightboxPhotos.length > 0 && event.ctrlKey) {
				event.preventDefault();
				if (event.deltaY < 0) {
					setLightboxZoom((prev) => Math.min(prev + 0.1, 3));
				} else {
					setLightboxZoom((prev) => Math.max(prev - 0.1, 0.5));
				}
			}
		};

		if (lightboxPhotos.length > 0) {
			window.addEventListener("keydown", handleEscape);
			window.addEventListener("wheel", handleWheel, { passive: false });
			return () => {
				window.removeEventListener("keydown", handleEscape);
				window.removeEventListener("wheel", handleWheel);
			};
		}
	}, [lightboxPhotos.length]);

	const openLightbox = (attachments, index) => {
		const photos = attachments
			.map((attachment, photoIndex) => {
				if (typeof attachment === "string") {
					return {
						src: attachment,
						alt: `${restaurant?.name || "Restaurant"} photo ${photoIndex + 1}`,
					};
				}

				const resolvedSrc = attachment?.src || (attachment?.filename ? `http://localhost:5000/uploads/feedback/${attachment.filename}` : "");
				if (!resolvedSrc) {
					return null;
				}

				return {
					src: resolvedSrc,
					alt: attachment?.alt || attachment?.originalName || attachment?.filename || `${restaurant?.name || "Restaurant"} photo ${photoIndex + 1}`,
				};
			})
			.filter(Boolean);

		setLightboxPhotos(photos);
		setLightboxIndex(index);
		setLightboxZoom(1);
	};

	const closeLightbox = () => {
		setLightboxPhotos([]);
		setLightboxIndex(0);
		setLightboxZoom(1);
	};

	const showPreviousPhoto = () => {
		setLightboxIndex((prev) => {
			if (lightboxPhotos.length <= 1) {
				return prev;
			}
			setLightboxZoom(1);
			return prev === 0 ? lightboxPhotos.length - 1 : prev - 1;
		});
	};

	const showNextPhoto = () => {
		setLightboxIndex((prev) => {
			if (lightboxPhotos.length <= 1) {
				return prev;
			}
			setLightboxZoom(1);
			return prev === lightboxPhotos.length - 1 ? 0 : prev + 1;
		});
	};

	const zoomIn = () => {
		setLightboxZoom((prev) => Math.min(prev + 0.25, 3));
	};

	const zoomOut = () => {
		setLightboxZoom((prev) => Math.max(prev - 0.25, 0.5));
	};

	const resetZoom = () => {
		setLightboxZoom(1);
	};

	const handleFileChange = (event) => {
		const files = Array.from(event.target.files);
		setReviewForm((prev) => ({
			...prev,
			attachments: [...prev.attachments, ...files],
		}));
		event.target.value = "";
	};

	const handleSubmitReview = async (event) => {
		event.preventDefault();
		setError("");
		setSuccess("");

		if (!restaurant) {
			setError("Restaurant details are unavailable");
			return;
		}

		if (!reviewForm.comment.trim() || reviewForm.rating === 0) {
			setError("Please fill in all required fields");
			return;
		}

		try {
			setSubmitting(true);
			const formData = new FormData();
			formData.append("userId", userId);
			formData.append("username", username);
			formData.append("restaurantId", restaurant.id);
			formData.append("restaurantName", restaurant.name);
			formData.append("rating", reviewForm.rating);
			formData.append("comment", reviewForm.comment);

			reviewForm.attachments.forEach((file) => {
				formData.append("attachments", file);
			});

			const response = await api.post("/reviews", formData, {
			});

			if (response.data.success) {
				setSuccess("Review posted successfully!");
				setShowReviewDialog(false);
				setReviewForm({ rating: 0, comment: "", attachments: [] });
				const refreshed = await api.get(`/reviews/restaurant/${restaurant.id}`);
				if (refreshed.data.success) {
					setReviews(refreshed.data.reviews);
				}
				setTimeout(() => setSuccess(""), 3000);
			}
		} catch (err) {
			setError(err.response?.data?.message || err.message || "Error posting review");
			console.error("Error posting restaurant review:", err);
		} finally {
			setSubmitting(false);
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

	if (!restaurant) {
		return (
			<main className="restaurant-page-shell">
				<section className="restaurant-hero">
					<div className="restaurant-hero-copy">
						<button type="button" className="restaurant-hero-back-btn" onClick={() => navigate(backPath)}>
							<span aria-hidden="true">←</span>
							{backLabel}
						</button>
						<p className="eyebrow">Restaurant not found</p>
						<h1>We could not load this restaurant.</h1>
						<p>The selected place is not in the current restaurant list.</p>
						<button className="restaurant-back-btn" type="button" onClick={() => navigate(backPath)}>
							Back to map
						</button>
					</div>
				</section>
			</main>
		);
	}

	return (
		<main className="restaurant-page-shell">
			<section className="restaurant-hero">
				<div className="restaurant-hero-copy">
					<button type="button" className="restaurant-hero-back-btn" onClick={() => navigate(backPath)}>
						<span aria-hidden="true">←</span>
						{backLabel}
					</button>
					<p className="eyebrow">Restaurant details</p>
					<h1>{restaurant.name}</h1>
					<p className="hero-description">{restaurant.description || ""}</p>
					<div className="restaurant-tag-row">
						{(restaurant.tags || []).map((tag) => (
							<span key={tag} className="restaurant-tag">
								{tag}
							</span>
						))}
					</div>
				</div>
				<div className="restaurant-hero-card">
					<div className="restaurant-score">
						<strong>{Number(restaurant.rating || 0).toFixed(1)}</strong>
						<span>Community rating</span>
					</div>
					<div className="restaurant-fact">
						<span>Operating hours</span>
						<strong>{operatingHoursText}</strong>
					</div>
					<div className="restaurant-fact">
						<span>Distance</span>
						<strong>{restaurant.distance}</strong>
					</div>
				</div>
			</section>

			{restaurantPreviewPhotos.length > 0 && (
				<section className="restaurant-gallery-section">
					<div className="restaurant-gallery-card">
						<div className="restaurant-gallery-grid">
							{(() => {
								const remainingPhotos = Math.max(0, restaurantPhotos.length - 3);

								return restaurantPreviewPhotos.map((photo, index) => (
									<div key={`${photo.src}-${index}`} className="restaurant-gallery-tile">
										<button
											type="button"
											className="restaurant-gallery-item"
											onClick={() => openLightbox(restaurantPhotos, photo.lightboxIndex)}
										>
											<img
												src={photo.src}
												alt={photo.alt}
												className="restaurant-gallery-image"
											/>
										</button>
										{index === 2 && remainingPhotos > 0 && (
											<div className="restaurant-gallery-overlay" aria-hidden="true">
												<span>+{remainingPhotos}</span>
											</div>
										)}
									</div>
								));
							})()}
						</div>
					</div>
				</section>
			)}

			<section className="restaurant-details-grid">
				<div className="restaurant-map-card">
					<div className="map-section-header">
						<div>
							<h2>Map preview</h2>
						</div>
						<button className="map-legend-chip" type="button" disabled>
							{restaurant.distance || "-"}
						</button>
					</div>
					<div className="restaurant-map-board">
						<div className="map-grid" aria-hidden="true" />
						<button
							type="button"
							className="map-pin map-pin-large"
							style={{ top: restaurant.location.top, left: restaurant.location.left }}
							onClick={() => setShowReviewDialog(true)}
						>
							<span className="pin-dot" />
							<span className="pin-label">{restaurant.name}</span>
						</button>
					</div>
				</div>

				<div className="restaurant-review-cta">
					<h2>Write a review</h2>
					<p>
						{openedFromAdmin
							? "Jump to the admin community page to review all feedback for this restaurant."
							: "Please note that your review will be posted on the community page too."}
					</p>
					<button
						className="btn-write-review"
						type="button"
						onClick={() => {
							if (openedFromAdmin) {
								navigate("/admin/community", { state: { fromAdmin: true } });
								return;
							}
							setShowReviewDialog(true);
						}}
						disabled={submitting}
					>
						{reviewActionLabel}
					</button>
					<button className="restaurant-back-btn secondary" type="button" onClick={() => navigate(backPath)}>Back to map</button>
				</div>
			</section>

			{success && <div className="alert alert-success">{success}</div>}
			{error && <div className="alert alert-error">{error}</div>}

			{showReviewDialog && (
				<div className="review-dialog-overlay" onClick={() => setShowReviewDialog(false)}>
					<div className="review-dialog" onClick={(event) => event.stopPropagation()}>
						<div className="review-dialog-header">
							<h2>Write a Review</h2>
							<button className="btn-close" onClick={() => setShowReviewDialog(false)}>
								×
							</button>
						</div>

						<form onSubmit={handleSubmitReview} className="review-form">
							<div className="form-group">
								<label>Restaurant</label>
								<div className="locked-restaurant-name">{restaurant.name}</div>
							</div>

							<div className="form-group">
								<label>Rating*</label>
								<div className="review-stars">
									{[1, 2, 3, 4, 5].map((star) => (
										<button
											key={star}
											type="button"
											className={`star-btn ${star <= reviewForm.rating ? "active" : ""}`}
											onClick={() => setReviewForm((prev) => ({ ...prev, rating: star }))}
											disabled={submitting}
										>
											★
										</button>
									))}
								</div>
								<span className="rating-text">
									{reviewForm.rating > 0 ? ratingLabels[reviewForm.rating - 1] : "Click to rate"}
								</span>
							</div>

							<div className="form-group">
								<label htmlFor="comment">Your Review*</label>
								<textarea
									id="comment"
									value={reviewForm.comment}
									onChange={(event) =>
										setReviewForm((prev) => ({ ...prev, comment: event.target.value }))
									}
									placeholder="Share your experience at this restaurant..."
									disabled={submitting}
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
										disabled={submitting}
										className="file-input-hidden"
										accept="image/*"
									/>
								</div>

								{reviewForm.attachments.length > 0 && (
									<div className="attachments-preview">
										{reviewForm.attachments.map((file, index) => (
											<div key={`${file.name}-${index}`} className="attachment-item">
												<span>{file.name}</span>
												<button
													type="button"
													className="btn-remove"
													onClick={() =>
														setReviewForm((prev) => ({
															...prev,
															attachments: prev.attachments.filter((_, attachmentIndex) => attachmentIndex !== index),
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
								<button type="button" className="btn-cancel" onClick={() => setShowReviewDialog(false)} disabled={submitting}>
									Cancel
								</button>
								<button type="submit" className="btn-submit" disabled={submitting || reviewForm.rating === 0}>
									{submitting ? "Posting..." : "Post Review"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			<section className="reviews-section restaurant-reviews-section">
				<h2>Reviews from other users ({reviews.length})</h2>
				{reviewsLoading ? (
					<p style={{ textAlign: "center", color: "#61707D" }}>Loading reviews...</p>
				) : reviews.length === 0 ? (
					<div className="no-reviews">
						<p>No reviews yet. Be the first to share your experience!</p>
					</div>
				) : (
					<div className="reviews-list">
						{reviews.map((review) => (
							<div
								key={review.id}
								className="review-card review-card-link"
								role="button"
								tabIndex={0}
								onClick={() => navigate("/community", { state: { reviewId: review.id, restaurantId: restaurant.id } })}
								onKeyDown={(event) => {
									if (event.key === "Enter" || event.key === " ") {
										event.preventDefault();
										navigate("/community", { state: { reviewId: review.id, restaurantId: restaurant.id } });
									}
								}}
							>
								<div className="review-header">
									<div className="review-user-info">
										<strong className="review-username">{review.username}</strong>
										<span className="review-date">{formatDate(review.createdAt)}</span>
									</div>
								</div>

								<div className="review-rating">
									{[1, 2, 3, 4, 5].map((star) => (
										<span key={star} className="rating-star">
											{star <= review.rating ? "★" : "☆"}
										</span>
									))}
									<span className="rating-label">{ratingLabels[review.rating - 1]}</span>
								</div>

								<p className="review-comment">{review.comment}</p>

								{review.attachments && review.attachments.length > 0 && (
									<div className="review-attachments">
										{review.attachments.map((attachment, index) => (
											<img
												key={index}
												src={`http://localhost:5000/uploads/feedback/${attachment.filename}`}
												alt={attachment.originalName || attachment.filename}
												className="review-photo"
												onClick={(event) => {
													event.stopPropagation();
													openLightbox(review.attachments, index);
												}}
											/>
										))}
									</div>
								)}
							</div>
						))}
					</div>
				)}
			</section>

			{lightboxPhotos.length > 0 && (
				<div className="lightbox-overlay" onClick={closeLightbox}>
					<div className="lightbox-container" onClick={(event) => event.stopPropagation()}>
						<button className="lightbox-close" onClick={closeLightbox} title="Close (Esc)">
							×
						</button>
						{lightboxPhotos.length > 1 && (
							<>
								<button className="lightbox-nav lightbox-nav-prev" onClick={showPreviousPhoto} title="Previous photo">
									‹
								</button>
								<button className="lightbox-nav lightbox-nav-next" onClick={showNextPhoto} title="Next photo">
									›
								</button>
							</>
						)}
						<div className="lightbox-image-frame">
							<img
								src={lightboxPhotos[lightboxIndex]?.src}
								alt={lightboxPhotos[lightboxIndex]?.alt || "Full view"}
								className="lightbox-image"
								style={{ transform: `scale(${lightboxZoom})` }}
							/>
						</div>
						<div className="lightbox-toolbar">
							<div className="lightbox-counter">
								{lightboxIndex + 1} / {lightboxPhotos.length}
							</div>
							<div className="lightbox-zoom-button">
								<button 
									type="button" 
									className="lightbox-lens-btn" 
									onClick={zoomIn}
									title="Click to zoom in (or use trackpad 2-finger scroll to zoom)"
									aria-label="Zoom lens"
								>
									<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="lens-icon">
										<circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="2"/>
										<path d="M15 15l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
										<text x="10" y="13" textAnchor="middle" fontSize="8" fontWeight="bold" fill="currentColor">+</text>
									</svg>
									<span className="zoom-level">{(lightboxZoom).toFixed(1)}x</span>
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</main>
	);
}