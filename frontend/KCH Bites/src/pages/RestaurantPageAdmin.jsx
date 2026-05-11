import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import "../styles/RestaurantPageAdmin.css";

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const createEmptyOperatingHours = () =>
	WEEK_DAYS.reduce((accumulator, day) => {
		accumulator[day] = "";
		return accumulator;
	}, {});

const createEmptyFormData = () => ({
	name: "",
	address: "",
	description: "",
	tags: "",
	photos: "",
	operatingHours: createEmptyOperatingHours(),
	lat: "",
	lng: "",
});

const normalizeOperatingHoursForForm = (operatingHours) => {
	const emptyHours = createEmptyOperatingHours();

	if (!operatingHours) {
		return emptyHours;
	}

	if (typeof operatingHours === "string") {
		return {
			...emptyHours,
			Mon: operatingHours,
		};
	}

	if (typeof operatingHours !== "object") {
		return emptyHours;
	}

	return WEEK_DAYS.reduce((accumulator, day) => {
		const value = operatingHours[day];

		if (typeof value === "string") {
			accumulator[day] = value;
			return accumulator;
		}

		if (value && typeof value === "object") {
			if (value.closed) {
				accumulator[day] = "Closed";
			} else if (value.start && value.end) {
				accumulator[day] = `${value.start} - ${value.end}`;
			}
		}

		return accumulator;
	}, emptyHours);
};

const formatOperatingHoursSummary = (operatingHours) => {
	if (!operatingHours) {
		return "-";
	}

	if (typeof operatingHours === "string") {
		const rows = operatingHours
			.split("|")
			.map((entry) => entry.trim())
			.filter(Boolean);

		return rows.length > 0 ? rows.join("\n") : operatingHours;
	}

	if (typeof operatingHours !== "object") {
		return "-";
	}

	const summary = WEEK_DAYS.map((day) => {
		const value = operatingHours[day];

		if (typeof value === "string") {
			const trimmedValue = value.trim();
			return trimmedValue ? `${day}: ${trimmedValue}` : null;
		}

		if (value && typeof value === "object") {
			if (value.closed) {
				return `${day}: Closed`;
			}

			if (value.start && value.end) {
				return `${day}: ${value.start}-${value.end}`;
			}
		}

		return null;
	}).filter(Boolean);

	return summary.length > 0 ? summary.join("\n") : "-";
};

const getPreviewPhotoSources = (restaurant) => {
	const sources = [
		...(Array.isArray(restaurant?.photos) ? restaurant.photos : []),
		...(Array.isArray(restaurant?.images)
			? restaurant.images.map((image) => image?.src || image).filter(Boolean)
			: []),
	].filter(Boolean);

	return sources;
};

const parsePhotoUrls = (rawValue) => {
	if (!rawValue) {
		return [];
	}

	return rawValue
		.split(/[\n,;]+/)
		.map((entry) => entry.trim().replace(/^"|"$/g, "").replace(/^'|'$/g, ""))
		.filter(Boolean);
};

function ActionIconButton({ className, label, onClick, disabled, children }) {
	return (
		<button
			type="button"
			className={className}
			onClick={onClick}
			disabled={disabled}
			title={label}
			aria-label={label}
		>
			{children}
			<span className="sr-only">{label}</span>
		</button>
	);
}

function EditIcon() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm2.92 2.83H5v-.92l8.06-8.06.92.92-8.06 8.06ZM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.33-2.33a1.003 1.003 0 0 0-1.42 0L15.13 4.12l3.75 3.75 1.83-1.83Z" />
		</svg>
	);
}

function DeleteIcon() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path d="M9 3.75A1.75 1.75 0 0 1 10.75 2h2.5A1.75 1.75 0 0 1 15 3.75V5h4a1 1 0 1 1 0 2h-1.02l-.67 10.23A2.75 2.75 0 0 1 14.56 20H9.44a2.75 2.75 0 0 1-2.75-2.77L6.02 7H5a1 1 0 1 1 0-2h4V3.75ZM10.75 4a.25.25 0 0 0-.25.25V5h3v-.75a.25.25 0 0 0-.25-.25h-2.5Zm-2.73 3 .65 10a.75.75 0 0 0 .75.7h5.16a.75.75 0 0 0 .75-.7l.65-10H8.02Zm2.23 2a.75.75 0 0 1 .75.75v5.5a.75.75 0 0 1-1.5 0v-5.5A.75.75 0 0 1 10.25 9Zm3.5 0a.75.75 0 0 1 .75.75v5.5a.75.75 0 0 1-1.5 0v-5.5A.75.75 0 0 1 13.75 9Z" />
		</svg>
	);
}

function ViewIcon() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path d="M12 5c5.5 0 9.6 4.3 11 7-1.4 2.7-5.5 7-11 7S2.4 14.7 1 12c1.4-2.7 5.5-7 11-7Zm0 2C8 7 4.7 9.9 3.3 12 4.7 14.1 8 17 12 17s7.3-2.9 8.7-5C19.3 9.9 16 7 12 7Zm0 1.5A3.5 3.5 0 1 1 12 16a3.5 3.5 0 0 1 0-7Zm0 2A1.5 1.5 0 1 0 12 13a1.5 1.5 0 0 0 0-3Z" />
		</svg>
	);
}

export default function RestaurantPageAdmin() {
	const navigate = useNavigate();
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const [restaurants, setRestaurants] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [showDialog, setShowDialog] = useState(false);
	const [editingId, setEditingId] = useState(null);
	const [formData, setFormData] = useState(createEmptyFormData);
	const [deleteConfirmId, setDeleteConfirmId] = useState(null);
	const [lastCreatedRestaurant, setLastCreatedRestaurant] = useState(null);
	const [previewRestaurant, setPreviewRestaurant] = useState(null);
	const [showPreview, setShowPreview] = useState(false);

	const handleViewAsUser = (restaurant) => {
		// hide dialog if open to avoid overlay blocking
		setShowDialog(false);
		setPreviewRestaurant(restaurant);
		setShowPreview(true);
	};

	const handleLogout = () => {
		localStorage.removeItem("token");
		localStorage.removeItem("user");
		window.location.href = "/login";
	};

	const menuItems = [
		{ label: 'Profile', to: '/admin/profile' }
	];

	useEffect(() => {
		fetchRestaurants();
	}, []);

	const fetchRestaurants = async () => {
		try {
			setLoading(true);
			const response = await api.get("/restaurants");
			if (response.data.success) {
				setRestaurants(response.data.restaurants);
			}
		} catch (err) {
			console.error("Error fetching restaurants:", err);
			setError("Failed to load restaurants");
		} finally {
			setLoading(false);
		}
	};

	const handleOpenDialog = (restaurant = null) => {
		// ensure preview is closed so dialog is interactive
		setShowPreview(false);
		if (restaurant) {
			setEditingId(restaurant._id);
			setFormData({
				name: restaurant.name || "",
				address: restaurant.address || "",
				description: restaurant.description || "",
				tags: Array.isArray(restaurant.tags) ? restaurant.tags.join(", ") : "",
				photos: Array.isArray(restaurant.photos) ? restaurant.photos.join(", ") : "",
				operatingHours: normalizeOperatingHoursForForm(restaurant.operatingHours),
				lat: restaurant.location?.coordinates[1] || "",
				lng: restaurant.location?.coordinates[0] || "",
			});
		} else {
			setEditingId(null);
			setFormData(createEmptyFormData());
		}
		setShowDialog(true);
	};

	const handleCloseDialog = () => {
		setShowDialog(false);
		setEditingId(null);
		setFormData(createEmptyFormData());
		setError("");
	};

	const handleFormChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const handleOperatingHoursChange = (day, value) => {
		setFormData((prev) => ({
			...prev,
			operatingHours: {
				...prev.operatingHours,
				[day]: value,
			},
		}));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");
		setSuccess("");

		if (!formData.name.trim()) {
			setError("Restaurant name is required");
			return;
		}

		try {
			setLoading(true);
			const submitData = {
				name: formData.name,
				address: formData.address || null,
				description: formData.description || null,
				tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()) : [],
				photos: parsePhotoUrls(formData.photos),
				operatingHours: formData.operatingHours,
			};

			if (formData.lat && formData.lng) {
				submitData.lat = parseFloat(formData.lat);
				submitData.lng = parseFloat(formData.lng);
			}

			if (editingId) {
				// Update
				const response = await api.put(`/restaurants/${editingId}`, submitData);
				if (response.data.success) {
					if (response.data.restaurant) {
						const merged = {
							...response.data.restaurant,
							operatingHours: normalizeOperatingHoursForForm(response.data.restaurant.operatingHours),
						};
						setRestaurants((prev) => prev.map((restaurant) => (restaurant._id === editingId ? merged : restaurant)));
						setSuccess("Restaurant updated successfully!");
						handleCloseDialog();
					}
				}
			} else {
				// Create
				const response = await api.post("/restaurants", submitData);
				if (response.data.success) {
					if (response.data.restaurant) {
						const merged = {
							...response.data.restaurant,
							operatingHours: normalizeOperatingHoursForForm(response.data.restaurant.operatingHours),
						};
						setRestaurants((prev) => [merged, ...prev]);
						setLastCreatedRestaurant(merged || null);
					}
					setSuccess("Restaurant created successfully!");
					handleCloseDialog();
				}
			}
		} catch (err) {
			setError(err.response?.data?.message || "Error saving restaurant");
			console.error("Error saving restaurant:", err);
		} finally {
			setLoading(false);
		}
	};

	const handleDeleteClick = (id) => {
		setDeleteConfirmId(id);
	};

	const handleConfirmDelete = async () => {
		try {
			setLoading(true);
			const response = await api.delete(`/restaurants/${deleteConfirmId}`);
			if (response.data.success) {
				setSuccess("Restaurant deleted successfully!");
				fetchRestaurants();
				setDeleteConfirmId(null);
			}
		} catch (err) {
			setError(err.response?.data?.message || "Error deleting restaurant");
			console.error("Error deleting restaurant:", err);
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<Header
				title="Restaurant Management"
				subtitle="Add, edit, or delete restaurants"
				isSidebarOpen={isSidebarOpen}
				setIsSidebarOpen={setIsSidebarOpen}
				bellTo="/admin/news"
			/>

			<Sidebar
				isSidebarOpen={isSidebarOpen}
				setIsSidebarOpen={setIsSidebarOpen}
				handleLogout={handleLogout}
				menuItems={menuItems}
				profileTo="/admin/profile"
			/>


			<main className="restaurant-admin-container">
				{success && (
					<div className="alert alert-success">
						<span>{success}</span>
						{lastCreatedRestaurant && (
							<button
								type="button"
								className="btn-view"
								onClick={() => handleViewAsUser(lastCreatedRestaurant)}
							>
								View as user
							</button>
							)}
					</div>
				)}
				{error && <div className="alert alert-error">{error}</div>}

				{/* Add Restaurant Button */}
				<div className="admin-header">
					<button
						className="btn-add-restaurant"
						onClick={() => handleOpenDialog()}
						disabled={loading}
					>
						+ Add Restaurant
					</button>
				</div>

				{/* Restaurants Table */}
				{loading && restaurants.length === 0 ? (
					<div className="loading-message">Loading restaurants...</div>
				) : restaurants.length === 0 ? (
					<div className="empty-message">No restaurants found. Create one to get started!</div>
				) : (
					<div className="restaurants-table-wrapper">
						<table className="restaurants-table">
							<thead>
								<tr>
										<th className="table-head-center">Name</th>
										<th className="table-head-center">Address</th>
										<th className="table-head-center">Description</th>
										<th className="table-head-center">Operating Hours</th>
										<th className="table-head-center">Tags</th>
										<th className="table-head-center">Actions</th>
								</tr>
							</thead>
							<tbody>
								{restaurants.map((restaurant) => (
									<tr key={restaurant._id}>
										<td>{restaurant.name}</td>
										<td>{restaurant.address || "-"}</td>
										<td className="description-cell">{restaurant.description || "-"}</td>
										<td className="operating-hours-cell">
											{formatOperatingHoursSummary(restaurant.operatingHours)}
										</td>
										<td>
											{Array.isArray(restaurant.tags) && restaurant.tags.length > 0
												? restaurant.tags.join(", ")
												: "-"}
										</td>
										<td className="actions-cell">
												<ActionIconButton
													className="action-icon-button action-edit"
													label={`Edit restaurant ${restaurant.name}`}
													onClick={() => handleOpenDialog(restaurant)}
													disabled={loading}
												>
													<EditIcon />
												</ActionIconButton>
												<ActionIconButton
													className="action-icon-button action-delete"
													label={`Delete restaurant ${restaurant.name}`}
													onClick={() => handleDeleteClick(restaurant._id)}
													disabled={loading}
												>
													<DeleteIcon />
												</ActionIconButton>
												<ActionIconButton
													className="action-icon-button action-view"
													label={`View restaurant ${restaurant.name} as user`}
													onClick={() => handleViewAsUser(restaurant)}
													disabled={loading}
												>
													<ViewIcon />
												</ActionIconButton>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				{/* Add/Edit Dialog */}
				{showDialog && (
					<div className="dialog-overlay" onClick={handleCloseDialog}>
						<div className="dialog" onClick={(e) => e.stopPropagation()}>
							<div className="dialog-header">
								<h2>{editingId ? "Edit Restaurant" : "Add Restaurant"}</h2>
								<button className="btn-close" onClick={handleCloseDialog}>
									×
								</button>
							</div>

							<form onSubmit={handleSubmit} className="restaurant-form">
								<div className="form-group">
									<label htmlFor="name">Restaurant Name*</label>
									<input
										id="name"
										type="text"
										name="name"
										value={formData.name}
										onChange={handleFormChange}
										placeholder="Enter restaurant name"
										disabled={loading}
										className="form-input"
									/>
								</div>

								<div className="form-group">
									<label htmlFor="address">Address</label>
									<input
										id="address"
										type="text"
										name="address"
										value={formData.address}
										onChange={handleFormChange}
										placeholder="Enter address"
										disabled={loading}
										className="form-input"
									/>
								</div>

								<div className="form-group">
									<label htmlFor="description">Description</label>
									<textarea
										id="description"
										name="description"
										value={formData.description}
										onChange={handleFormChange}
										placeholder="Enter restaurant description"
										disabled={loading}
										className="form-textarea"
										rows="4"
									/>
								</div>

								<div className="form-group">
									<label htmlFor="tags">Tags (comma-separated)</label>
									<input
										id="tags"
										type="text"
										name="tags"
										value={formData.tags}
										onChange={handleFormChange}
										placeholder="e.g., Italian, Fast Food, Vegetarian"
										disabled={loading}
										className="form-input"
									/>
								</div>

										<div className="form-group">
											<label>Operating Hours</label>
											<div className="operating-hours-list">
												{WEEK_DAYS.map((day) => (
													<div key={day} className="operating-hours-day-row">
														<label className="day-label" htmlFor={`operating-hours-${day}`}>
															{day}
														</label>
														<input
															id={`operating-hours-${day}`}
															type="text"
															value={formData.operatingHours[day]}
															onChange={(e) => handleOperatingHoursChange(day, e.target.value)}
															disabled={loading}
															className="form-input operating-hours-input"
															placeholder="9:00 AM - 3:00 PM"
														/>
													</div>
												))}
											</div>
											<p className="operating-hours-help">Type the hours manually for each day. You can use any format you want, for example: 9:00 AM - 3:00 PM or Closed.</p>
										</div>

									<div className="form-group">
										<label htmlFor="photos">Photos URLs (comma-separated)</label>
									<textarea
										id="photos"
										name="photos"
										value={formData.photos}
										onChange={handleFormChange}
										placeholder="Enter photo URLs separated by commas"
										disabled={loading}
										className="form-textarea"
										rows="3"
									/>
								</div>

								<div className="form-row">
									<div className="form-group">
										<label htmlFor="lat">Latitude</label>
										<input
											id="lat"
											type="number"
											name="lat"
											value={formData.lat}
											onChange={handleFormChange}
											placeholder="e.g., 1.5520"
											disabled={loading}
											className="form-input"
											step="any"
										/>
									</div>
									<div className="form-group">
										<label htmlFor="lng">Longitude</label>
										<input
											id="lng"
											type="number"
											name="lng"
											value={formData.lng}
											onChange={handleFormChange}
											placeholder="e.g., 110.3592"
											disabled={loading}
											className="form-input"
											step="any"
										/>
									</div>
								</div>

								<div className="dialog-actions">
									<button
										type="button"
										className="btn-cancel"
										onClick={handleCloseDialog}
										disabled={loading}
									>
										Cancel
									</button>
									<button
										type="submit"
										className="btn-submit"
										disabled={loading}
									>
										{loading ? "Saving..." : editingId ? "Update Restaurant" : "Add Restaurant"}
									</button>
								</div>
							</form>
						</div>
					</div>
				)}

				{/* Delete Confirmation Dialog */}
				{deleteConfirmId && (
					<div className="dialog-overlay" onClick={() => setDeleteConfirmId(null)}>
						<div className="dialog dialog-confirm" onClick={(e) => e.stopPropagation()}>
							<div className="dialog-header">
								<h2>Delete Restaurant</h2>
							</div>
							<p>Are you sure you want to delete this restaurant? This action cannot be undone.</p>
							<div className="dialog-actions">
								<button
									type="button"
									className="btn-cancel"
									onClick={() => setDeleteConfirmId(null)}
									disabled={loading}
								>
									Cancel
								</button>
								<button
									type="button"
									className="btn-delete"
									onClick={handleConfirmDelete}
									disabled={loading}
								>
									{loading ? "Deleting..." : "Delete"}
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Preview Modal (user view) */}
				{showPreview && previewRestaurant && (
					<div className="preview-overlay" onClick={() => setShowPreview(false)}>
						<div className="preview-card preview-full" onClick={(e) => e.stopPropagation()}>
							<div className="preview-header">
								<h2>Preview as user</h2>
								<button className="btn-close" onClick={() => setShowPreview(false)}>×</button>
							</div>

							<div className="preview-content">
								{/* Hero Section */}
								<div className="preview-hero">
									<div className="preview-hero-copy">
										<p className="preview-eyebrow">Restaurant details</p>
										<h1>{previewRestaurant.name}</h1>
										<p className="preview-description">{previewRestaurant.description || ""}</p>
										<div className="preview-tags-row">
											{(previewRestaurant.tags || []).map((tag) => (
												<span key={tag} className="preview-tag">
													{tag}
												</span>
											))}
										</div>
									</div>
									<div className="preview-hero-card">
										<div className="preview-score">
											<strong>{Number(previewRestaurant.rating || 0).toFixed(1)}</strong>
											<span>Community rating</span>
										</div>
										<div className="preview-fact">
											<span>Operating hours</span>
											<strong>
												{formatOperatingHoursSummary(previewRestaurant.operatingHours)}
											</strong>
										</div>
										<div className="preview-fact">
											<span>Distance</span>
											<strong>{previewRestaurant.distance || "-"}</strong>
										</div>
									</div>
								</div>

								{/* Photos */}
									{(() => {
									const allPreviewPhotos = getPreviewPhotoSources(previewRestaurant);
									const previewPhotos = allPreviewPhotos.slice(0, 3);
									const remainingPhotos = Math.max(0, allPreviewPhotos.length - 3);

										return previewPhotos.length > 0 ? (
									<div className="preview-photos">
												{previewPhotos.map((photo, index) => (
													<div key={`${photo}-${index}`} className="preview-photo-tile">
											<img
												src={photo}
												alt={`${previewRestaurant.name} photo ${index + 1}`}
													referrerPolicy="no-referrer"
												className="preview-main-photo"
												onError={(e) => {
													e.currentTarget.style.display = "none";
												}}
											/>
														{index === 2 && remainingPhotos > 0 && (
															<div className="preview-photo-overlay" aria-hidden="true">
																<span>+{remainingPhotos}</span>
															</div>
														)}
													</div>
												))}
									</div>
										) : null;
									})()}

							{/* Location */}
							<div className="preview-location-section">
								<h3>Location</h3>
								<div className="preview-location-item">
									<label>Address</label>
									<p>{previewRestaurant.address || "-"}</p>
								</div>
								<div className="preview-location-item">
									<label>Coordinates</label>
									<p>
										Lat: {previewRestaurant.location?.coordinates?.[1] || previewRestaurant.lat || "-"}
										<br />
										Lng: {previewRestaurant.location?.coordinates?.[0] || previewRestaurant.lng || "-"}
									</p>
								</div>
								</div>
							</div>

							<div className="preview-actions">
								<button
									className="btn-close-preview"
									onClick={() => setShowPreview(false)}
								>
									Close Preview
								</button>
								<button
									className="btn-view"
									onClick={() => {
										setShowPreview(false);
										navigate(`/restaurant/${previewRestaurant._id || previewRestaurant.id}`, { state: { restaurant: previewRestaurant, fromAdmin: true } });
									}}
								>
									Open full view
								</button>
							</div>
						</div>
					</div>
				)}
			</main>

			<Footer />
		</>
	);
}
