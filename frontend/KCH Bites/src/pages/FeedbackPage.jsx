import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import { getUserRole } from "../services/auth";
import "../styles/FeedbackPage.css";

export default function FeedbackPage() {
	const navigate = useNavigate();
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const [feedbackList, setFeedbackList] = useState([]);
	const [showDetailedDialog, setShowDetailedDialog] = useState(false);
	const [feedbackType, setFeedbackType] = useState("feedback");
	const [message, setMessage] = useState("");
	const [attachments, setAttachments] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [mainRating, setMainRating] = useState(0);
	const [hoverRating, setHoverRating] = useState(0);
	const isRegisteredUser = getUserRole() === "user";

	// We only rely on username now (userId is optional)
	const username = localStorage.getItem("username") || localStorage.getItem("userFullName") || "Anonymous";

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

	useEffect(() => {
		fetchUserFeedback();

		// Poll for updates so users see admin responses shortly after they're saved
		const interval = setInterval(() => {
			fetchUserFeedback();
		}, 10000); // every 10 seconds

		return () => clearInterval(interval);
	}, []);

	const fetchUserFeedback = async () => {
		try {
			setLoading(true);
			// Fetch feedback by username (backend supports username lookup)
			const response = await api.get(`/feedback/username/${encodeURIComponent(username)}`);
			if (response.data.success) {
				// Normalize feedback items to include `id` string (use _id when present)
				const normalized = response.data.feedback.map((fb) => {
					const rawId = fb.id || fb._id || (fb._id && (fb._id.$oid || String(fb._id)));
					return { ...fb, id: rawId ? String(rawId) : undefined };
				});
				setFeedbackList(normalized);
			}
		} catch (err) {
			console.error("Error fetching feedback:", err);
		} finally {
			setLoading(false);
		}
	};

	const handleFileChange = (e) => {
		const files = Array.from(e.target.files);
		setAttachments(files);
	};

	// Submit quick rating only
	const handleQuickRating = async () => {
		if (!isRegisteredUser) {
			setError("Please log in as a registered user to submit feedback.");
			navigate("/login");
			return;
		}

		if (mainRating === 0) {
			setError("Please select a rating first");
			return;
		}

		try {
			setLoading(true);
			const formData = new FormData();
			// Only send username; userId is optional on the server
			formData.append("username", username);
			formData.append("message", `Quick Rating: ${["Poor", "Fair", "Good", "Very Good", "Excellent"][mainRating - 1]}`);
			formData.append("rating", mainRating);
			formData.append("type", "rating");

			const response = await api.post("/feedback", formData, {
				headers: {
					"Content-Type": "multipart/form-data",
				},
			});

			if (response.data.success) {
				setSuccess("Rating submitted successfully!");
				setMainRating(0);
				setHoverRating(0);
				fetchUserFeedback();

				setTimeout(() => setSuccess(""), 3000);
			}
		} catch (err) {
			setError(err.response?.data?.message || "Error submitting rating");
			console.error("Error submitting rating:", err);
		} finally {
			setLoading(false);
		}
	};

	// Submit detailed feedback
	const handleSubmitDetailedFeedback = async (e) => {
		e.preventDefault();
		setError("");
		setSuccess("");

		if (!isRegisteredUser) {
			setError("Please log in as a registered user to submit feedback.");
			navigate("/login");
			return;
		}

		if (!message.trim()) {
			setError("Please enter your feedback message");
			return;
		}

		try {
			setLoading(true);
			const formData = new FormData();
			// Only send username; userId is optional on the server
			formData.append("username", username);
			formData.append("message", message);
			formData.append("rating", 0);
			formData.append("type", feedbackType);

			// Add attachments
			attachments.forEach((file) => {
				formData.append("attachments", file);
			});

			const response = await api.post("/feedback", formData, {
				headers: {
					"Content-Type": "multipart/form-data",
				},
			});

			if (response.data.success) {
				setSuccess("Feedback submitted successfully!");
				setMessage("");
				setAttachments([]);
				setShowDetailedDialog(false);
				fetchUserFeedback();

				setTimeout(() => setSuccess(""), 3000);
			}
		} catch (err) {
			setError(err.response?.data?.message || "Error submitting feedback");
			console.error("Error submitting feedback:", err);
		} finally {
			setLoading(false);
		}
	};

	const formatDate = (dateString) => {
		if (!dateString) return "No date";
		const date = new Date(dateString);
		if (isNaN(date.getTime())) return "Invalid Date";
		return date.toLocaleString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	return (
		<div className="feedback-page-wrapper">
			<Header
				title="Feedback"
				subtitle="Share your thoughts with our admin team"
				isSidebarOpen={isSidebarOpen}
				setIsSidebarOpen={setIsSidebarOpen}
			/>

			<Sidebar
				isSidebarOpen={isSidebarOpen}
				setIsSidebarOpen={setIsSidebarOpen}
				handleLogout={handleLogout}
				menuItems={menuItems}
			/>

			<main className="feedback-container">
				{success && <div className="alert alert-success">{success}</div>}
				{error && <div className="alert alert-error">{error}</div>}

				{/* Quick Feedback Rating Section */}
				<section className="quick-feedback-section">
					<div className="rating-card">
						<h2>How's your experience?</h2>
						<p className="rating-subtitle">Rate and let us know what you think</p>
						<div className="star-rating">
							{[1, 2, 3, 4, 5].map((star) => (
								<button
									key={star}
									className={`star ${star <= mainRating ? "active" : ""} ${
										star <= hoverRating ? "hover" : ""
									}`}
									onMouseEnter={() => setHoverRating(star)}
									onMouseLeave={() => setHoverRating(0)}
									onClick={() => setMainRating(star)}
									disabled={loading}
								>
									★
								</button>
							))}
						</div>
						<p className="rating-text">
							{mainRating === 0
								? "Click to rate"
								: [
										"Poor",
										"Fair",
										"Good",
										"Very Good",
										"Excellent",
									][mainRating - 1]}
						</p>
						<div className="rating-buttons">
							<button
								className="btn-send-feedback"
								onClick={() => (isRegisteredUser ? handleQuickRating() : navigate("/login"))}
								disabled={loading || mainRating === 0}
							>
								Send Feedback
							</button>
						</div>
					</div>
				</section>

				{/* CTA for detailed feedback (moved outside rating card) */}
				<div className="detailed-feedback-cta">
					<p>Have more to say or want to attach files? Send a detailed message to our admins.</p>
					<button
						className="btn-detailed-feedback"
						onClick={() => (isRegisteredUser ? setShowDetailedDialog(true) : navigate("/login"))}
						disabled={loading}
					>
						Anything else you want to say?
					</button>
				</div>

				{/* Detailed Feedback Dialog */}
				{showDetailedDialog && (
					<div
						className="dialog-overlay"
						onClick={() => setShowDetailedDialog(false)}
					>
						<div
							className="dialog-content"
							onClick={(e) => e.stopPropagation()}
						>
							<div className="dialog-header">
								<h2>Share Your Feedback</h2>
								<button
									className="btn-close"
									onClick={() => setShowDetailedDialog(false)}
								>
									×
								</button>
							</div>

							<form onSubmit={handleSubmitDetailedFeedback} className="feedback-form">
								<div className="form-group">
									<label htmlFor="feedbackType">Feedback Type*</label>
									<select
										id="feedbackType"
										value={feedbackType}
										onChange={(e) => setFeedbackType(e.target.value)}
										disabled={loading}
										className="form-select"
									>
										<option value="feedback">General Feedback</option>
										<option value="bug">Bug Report</option>
										<option value="feature">Feature Request</option>
									</select>
								</div>

								<div className="form-group">
									<label htmlFor="message">
										Your {feedbackType === "bug" ? "Bug Report" : feedbackType === "feature" ? "Feature Request" : "Feedback"}*
									</label>
									<textarea
										id="message"
										value={message}
										onChange={(e) => setMessage(e.target.value)}
										placeholder={
											feedbackType === "bug"
												? "Please describe the bug you encountered..."
											: feedbackType === "feature"
												? "Describe the feature you'd like us to add~"
											: "Please share your feedback, suggestions or concerns so that we can improve!"
										}
										rows="6"
										disabled={loading}
									/>
								</div>

								<div className="form-group">
									<label htmlFor="attachments">
										Attach Images or PDF (Optional)
									</label>
									<div className="file-upload">
										<input
											id="attachments"
											type="file"
											multiple
											accept="image/*,.pdf"
											onChange={handleFileChange}
											disabled={loading}
											className="file-input-hidden"
										/>
										<label htmlFor="attachments" className="file-upload-label">
											<span className="file-upload-btn">Choose Files</span>
											<span className="file-upload-text">
												{attachments.length > 0 ? `${attachments.length} file(s) selected` : " No file chosen"}
											</span>
										</label>
									</div>
									{attachments.length > 0 && (
										<div className="attachments-preview">
											{attachments.map((file, idx) => (
												<div key={idx} className="attachment-item">
													<span>{file.name}</span>
													<button
														type="button"
														onClick={() => {
															setAttachments(
																attachments.filter((_, i) => i !== idx)
															);
														}}
														className="btn-remove"
													>
														Remove
													</button>
												</div>
											))}
										</div>
									)}
								</div>

								<div className="dialog-actions">
									<button
										type="button"
										className="btn-cancel"
										onClick={() => setShowDetailedDialog(false)}
										disabled={loading}
									>
										Cancel
									</button>
									<button
										type="submit"
										className="btn-submit"
										disabled={loading || !isRegisteredUser}
									>
										{loading ? "Submitting..." : "Submit"}
									</button>
								</div>
							</form>
						</div>
					</div>
				)}

				{/* Feedback History */}
				<div className="feedback-history">
					<h2>Your Feedback History</h2>
					{feedbackList.length > 0 && (
						<p className="feedback-history-note">
							✓ The submitted feedback is locked and cannot be edited. Create new feedback to submit changes.
						</p>
					)}
					{loading && feedbackList.length === 0 ? (
						<p className="no-feedback">Loading...</p>
					) : feedbackList.length === 0 ? (
						<p className="no-feedback">
							No feedback yet. Share your experience now!
						</p>
					) : (
						<div className="feedback-list">
							{feedbackList.map((feedback) => (
								<div
									key={feedback.id}
									className={`feedback-card ${
										feedback.rating > 0
											? "feedback-card-rating"
											: "feedback-card-detailed"
									}`}
								>
									<div className="feedback-header-card">
										<div>
											<span className="feedback-date">
												{formatDate(feedback.createdAt)}
											</span>
											<span className="feedback-type-badge">
												{feedback.type || "feedback"}
											</span>
										</div>
										{feedback.type !== "rating" && (
											<span
												className={`feedback-status status-${feedback.status}`}
											>
												{feedback.status}
											</span>
										)}
									</div>
									{feedback.rating > 0 && (
										<div className="feedback-rating">
											{[1, 2, 3, 4, 5].map((star) => (
												<span key={star} className="rating-star">
													{star <= (feedback.rating || 0) ? "★" : "☆"}
												</span>
											))}
										</div>
									)}
									<p className="feedback-message">{feedback.message}</p>
									{feedback.attachments && feedback.attachments.length > 0 && (
										<div className="feedback-attachments">
											<strong>Attachments:</strong>
											{feedback.attachments.map((att, idx) => (
												<a
													key={idx}
													href={`http://localhost:5000/uploads/feedback/${att.filename}`}
													target="_blank"
													rel="noopener noreferrer"
													className="attachment-tag"
													style={{ color: "#FF7A00", textDecoration: "none" }}
												>
													{att.originalName || att.filename}
												</a>
											))}
										</div>
									)}
									{feedback.adminResponse && (
										<div className="feedback-info">
											<strong>Admin Response:</strong>
											<p style={{ margin: "8px 0 0 0" }}>{feedback.adminResponse}</p>
											{feedback.responseDate && (
												<span style={{ display: "block", marginTop: "8px", fontSize: "0.85rem", opacity: 0.8 }}>
													Responded on {formatDate(feedback.responseDate)}
												</span>
											)}
										</div>
									)}
								</div>
							))}
						</div>
					)}
				</div>
			</main>
			<Footer />
		</div>
	);
}
