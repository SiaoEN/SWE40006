import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { UPLOADS_BASE_URL } from "../services/api";
import { clearAuthToken } from "../services/auth";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import "../styles/FeedbackPage.css";
import "../styles/FeedbackPageAdmin.css";

export default function FeedbackPageAdmin() {
	const navigate = useNavigate();
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const [allFeedback, setAllFeedback] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [expandedFeedback, setExpandedFeedback] = useState(null);
	// Per-card state: { [feedbackId]: { responseText, status } }
	const [cardStates, setCardStates] = useState({});

	const handleLogout = () => {
		clearAuthToken();
		window.location.href = "/login";
	};

	const menuItems = [
		{ label: 'Profile', to: '/admin/profile' }
	];

	const getFeedbackKey = (feedback) => {
		const rawId = feedback?.id || feedback?._id || (feedback?._id && (feedback._id.$oid || String(feedback._id)));
		return rawId ? String(rawId) : "";
	};

	const normalizeFeedback = (feedback) => {
		if (!feedback) return null;
		return { ...feedback, id: getFeedbackKey(feedback) };
	};

	const mergeUpdatedFeedback = (updatedFeedback, fallbackId) => {
		const normalizedFeedback = normalizeFeedback(updatedFeedback);
		if (!normalizedFeedback) return false;

		const normalizedId = normalizedFeedback.id || String(fallbackId || "");
		setAllFeedback((prev) =>
			prev.map((fb) => (getFeedbackKey(fb) === normalizedId ? normalizedFeedback : fb))
		);
		setCardStates((prev) => ({
			...prev,
			[normalizedId || fallbackId]: {
				responseText: normalizedFeedback.adminResponse || "",
				status: normalizedFeedback.status || "pending",
			},
		}));
		return true;
	};

	useEffect(() => {
		fetchAllFeedback();
	}, []);

	const fetchAllFeedback = async () => {
		try {
			setLoading(true);
			const response = await api.get("/feedback");
			if (response.data.success) {
				// Normalize feedback items: ensure `id` is a stable string key (use _id when present)
				const normalized = response.data.feedback.map((fb) => normalizeFeedback(fb));
				setAllFeedback(normalized);
				// Initialize cardStates for each feedback with current status and empty response
				const statesMap = {};
				normalized.forEach((fb) => {
					statesMap[fb.id] = {
						responseText: fb.adminResponse || "",
						status: fb.status || "pending",
					};
				});
				setCardStates(statesMap);
			}
		} catch (err) {
			setError("Error fetching feedback");
			console.error("Error fetching all feedback:", err);
		} finally {
			setLoading(false);
		}
	};

	const handleStatusChange = (feedbackId, newStatus) => {
		setCardStates((prev) => ({
			...prev,
			[feedbackId]: {
				...prev[feedbackId],
				status: newStatus,
			},
		}));
	};

	// Save status only (without response)
	const handleSaveStatusOnly = async (feedbackId) => {
		try {
			setLoading(true);
			const cardState = cardStates[feedbackId];
			const newStatus = cardState?.status || "pending";

			const payload = {
				status: newStatus,
			};

			const response = await api.put(`/feedback/${feedbackId}/status`, payload);

			if (response.data.success) {
				setSuccess("Status saved successfully!");
				const updatedFeedback = response.data.feedback;
				if (!mergeUpdatedFeedback(updatedFeedback, feedbackId)) {
					// fallback: refresh full list
					await fetchAllFeedback();
				}
				setExpandedFeedback(null);
				setTimeout(() => setSuccess(""), 3000);
			}
		} catch (err) {
			setError(err.response?.data?.message || "Error saving status");
			console.error("Error saving status:", err);
		} finally {
			setLoading(false);
		}
	};

	// Save response and status
	const handleSaveResponse = async (feedbackId) => {
		const previousExpandedFeedback = expandedFeedback;
		setExpandedFeedback(null);

		try {
			setLoading(true);
			const cardState = cardStates[feedbackId];
			const newStatus = cardState?.status || "pending";
			const adminResponse = cardState?.responseText?.trim();

			if (!adminResponse) {
				setError("Please enter a response");
				setExpandedFeedback(previousExpandedFeedback);
				setLoading(false);
				return;
			}

			const payload = {
				status: newStatus,
				adminResponse,
			};

			const response = await api.put(`/feedback/${feedbackId}/status`, payload);

			if (response.data.success) {
				setSuccess("Response saved successfully!");
				const updatedFeedback = response.data.feedback;
				if (!mergeUpdatedFeedback(updatedFeedback, feedbackId)) {
					await fetchAllFeedback();
				}
				setTimeout(() => setSuccess(""), 3000);
			} else {
				setExpandedFeedback(previousExpandedFeedback);
			}
		} catch (err) {
			setExpandedFeedback(previousExpandedFeedback);
			setError(err.response?.data?.message || "Error saving response");
			console.error("Error saving response:", err);
		} finally {
			setLoading(false);
		}
	};

	const handleUpdateStatus = async (feedbackId) => {
		try {
			setLoading(true);
			const cardState = cardStates[feedbackId];
			const newStatus = cardState?.status || "pending";
			const adminResponse = cardState?.responseText?.trim() || "";

			const payload = {
				status: newStatus,
				...(adminResponse && { adminResponse }),
			};

			const response = await api.put(`/feedback/${feedbackId}/status`, payload);

			if (response.data.success) {
				setSuccess("Feedback status updated successfully!");
				if (!mergeUpdatedFeedback(response.data.feedback, feedbackId)) {
					await fetchAllFeedback();
				}
				setTimeout(() => setSuccess(""), 3000);
			}
		} catch (err) {
			setError(err.response?.data?.message || "Error updating feedback");
			console.error("Error updating feedback status:", err);
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
		<div className="feedback-admin-page-wrapper">
			<Header
				title="Admin Feedback Management"
				subtitle="Review and respond to user feedback"
				isSidebarOpen={isSidebarOpen}
				setIsSidebarOpen={setIsSidebarOpen}
				bellTo="/admin/news"
				notificationMode="navigate"
			/>

			<Sidebar
				isSidebarOpen={isSidebarOpen}
				setIsSidebarOpen={setIsSidebarOpen}
				handleLogout={handleLogout}
				menuItems={menuItems}
				profileTo="/admin/profile"
			/>

			<main className="feedback-container">
				{success && <div className="alert alert-success">{success}</div>}
				{error && <div className="alert alert-error">{error}</div>}

				{loading && allFeedback.length === 0 ? (
					<div className="feedback-history">
						<p style={{ textAlign: "center", color: "#61707D" }}>Loading feedback...</p>
					</div>
				) : allFeedback.length === 0 ? (
					<div className="feedback-history">
						<div className="no-feedback">No feedback received yet</div>
					</div>
				) : (
					<div className="feedback-history">
						<h2>All Feedback ({allFeedback.length})</h2>
						<div className="feedback-list">
							{allFeedback.map((feedback) => (
								<div key={feedback.id} className="admin-feedback-card">
									{/* User Info */}
									<div className="admin-user-info">
										<div>
											<strong className="admin-username">{feedback.username || "Anonymous"}</strong>
										</div>
										<span className="feedback-date">{formatDate(feedback.createdAt)}</span>
									</div>

									{/* Feedback Type and Rating */}
									<div className="admin-feedback-meta">
										<span className="feedback-type-badge">{feedback.type || "feedback"}</span>
										{feedback.rating > 0 && (
											<div className="feedback-rating">
												{[1, 2, 3, 4, 5].map((star) => (
													<span key={star} className="rating-star">
														{star <= (feedback.rating || 0) ? "★" : "☆"}
													</span>
												))}
											</div>
										)}
									</div>

									{/* Feedback Message */}
									<p className="feedback-message">{feedback.message}</p>

									{/* Attachments */}
									{feedback.attachments && feedback.attachments.length > 0 && (
										<div className="feedback-attachments">
											<strong>Attachments:</strong>
											{feedback.attachments.map((att, idx) => (
												<a
													key={idx}
													href={`${UPLOADS_BASE_URL}/feedback/${att.filename}`}
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

									{/* Status and Response Section */}
									<div className="admin-controls">
										{/* Only allow changing status for non-rating feedback */}
										{feedback.type !== "rating" && (
    <div className="admin-status-section">
        <label htmlFor={`status-${feedback.id}`}>Status:</label>
        <select
            id={`status-${feedback.id}`}
            value={cardStates[feedback.id]?.status || "pending"}
            onChange={(e) => handleStatusChange(feedback.id, e.target.value)}
            className="admin-status-select"
            disabled={loading}
        >
            <option value="pending">Pending</option>
            <option value="in-review">In Review</option>
            <option value="resolved">Resolved</option>
        </select>
        <button
								type="button"
								onClick={() => handleSaveStatusOnly(feedback.id)}
            className="btn-submit"
            disabled={loading}
            style={{ marginLeft: "8px", padding: "8px 16px", fontSize: "0.9rem" }}
        >
            {loading ? "Saving..." : "Save Status"}
        </button>
    </div>
)}

										{/* Previous Response Display */}
										{feedback.adminResponse && (
											<div className="admin-response-display">
												<strong>Your Response:</strong>
												<p>{feedback.adminResponse}</p>
												<span className="response-date">
													Responded on: {formatDate(feedback.responseDate)}
												</span>
											</div>
										)}

										{/* Add/Edit Response */}
										{expandedFeedback === feedback.id ? (
											<div className="admin-response-section">
												<label htmlFor={`response-${feedback.id}`}>Add/Edit Response:</label>
												<textarea
													id={`response-${feedback.id}`}
													value={cardStates[feedback.id]?.responseText || ""}
													onChange={(e) =>
														setCardStates((prev) => ({
															...prev,
															[feedback.id]: {
																...prev[feedback.id],
																responseText: e.target.value,
															},
														}))
													}
													placeholder="Type your response to this feedback..."
													rows="4"
													className="admin-response-textarea"
													disabled={loading}
												/>
												<div className="admin-response-actions">
													<button
														type="button"
														onClick={() => {
															setExpandedFeedback(null);
														}}
														className="btn-cancel"
														disabled={loading}
													>
														Cancel
													</button>
													<button
														type="button"
													onClick={() => handleSaveResponse(feedback.id)}
													className="btn-submit"
													disabled={loading}
												>
													{loading ? "Saving..." : "Save Response"}
													</button>
												</div>
											</div>
										) : (
											<button
												type="button"
												onClick={() => {
													setExpandedFeedback(feedback.id);
												}}
												className="btn-detailed-feedback"
												disabled={loading}
											>
												Add/Edit Response
											</button>
										)}
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</main>
			<Footer />
		</div>
	);
}
