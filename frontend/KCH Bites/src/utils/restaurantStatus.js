const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function normalizeText(value) {
	return String(value || "")
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "");
}

function parseTimeToMinutes(value) {
	if (!value) return null;
	const match = String(value).trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
	if (!match) return null;

	let hours = Number(match[1]);
	const minutes = Number(match[2] || 0);
	const meridiem = String(match[3] || "").toLowerCase();

	if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
		return null;
	}

	if (meridiem === "pm" && hours < 12) hours += 12;
	if (meridiem === "am" && hours === 12) hours = 0;

	return hours * 60 + minutes;
}

function parseHoursEntry(entry) {
	if (!entry) return null;

	if (typeof entry === "string") {
		const trimmed = entry.trim();
		if (!trimmed) return null;
		if (/closed/i.test(trimmed)) {
			return { closed: true };
		}

		if (/24\s*hours?|open\s*24\s*hours?|always\s*open|open\s*daily|open\s*all\s*day/i.test(trimmed)) {
			return { openAllDay: true, raw: trimmed };
		}

		const rangeMatch = trimmed.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*[-–to]+\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
		if (rangeMatch) {
			return {
				start: parseTimeToMinutes(rangeMatch[1]),
				end: parseTimeToMinutes(rangeMatch[2]),
			};
		}

		return { raw: trimmed };
	}

	if (typeof entry === "object") {
		return {
			closed: Boolean(entry.closed),
			openAllDay: Boolean(entry.openAllDay),
			start: parseTimeToMinutes(entry.start || entry.open || entry.from),
			end: parseTimeToMinutes(entry.end || entry.close || entry.to),
			raw: entry.raw || null,
		};
	}

	return null;
}

function getOperatingHoursForDay(operatingHours, dayIndex) {
	if (!operatingHours) return null;

	if (Array.isArray(operatingHours)) {
		return parseHoursEntry(operatingHours[dayIndex]);
	}

	if (typeof operatingHours === "object") {
		const dayKey = DAY_NAMES[dayIndex];
		const entries = Object.entries(operatingHours);
		const matchedEntry = entries.find(([key]) => normalizeText(key).includes(dayKey) || normalizeText(key).startsWith(dayKey.slice(0, 3)));
		if (matchedEntry) {
			return parseHoursEntry(matchedEntry[1]);
		}

		return null;
	}

	if (typeof operatingHours === "string") {
		const segments = operatingHours.split(/[|\n]/).map((segment) => segment.trim()).filter(Boolean);
		const dayKey = DAY_NAMES[dayIndex];
		const matchedSegment = segments.find((segment) => normalizeText(segment).includes(dayKey) || normalizeText(segment).includes(dayKey.slice(0, 3)));
		if (matchedSegment) {
			const hoursPart = matchedSegment.split(/[:=]/).slice(1).join(":").trim();
			return parseHoursEntry(hoursPart || matchedSegment);
		}

		return parseHoursEntry(operatingHours);
	}

	return null;
}

function buildStatus(status, minutesUntilClose = null, minutesUntilOpen = null) {
	if (status === "closing-soon") {
		return {
			status,
			label: "Closing soon",
			minutesUntilClose,
			minutesUntilOpen: null,
		};
	}

	if (status === "open-soon") {
		return {
			status,
			label: "Open soon",
			minutesUntilClose: null,
			minutesUntilOpen,
		};
	}

	if (status === "open") {
		return {
			status,
			label: "Open now",
			minutesUntilClose,
			minutesUntilOpen,
		};
	}

	return {
		status: "closed",
		label: "Closed",
		minutesUntilClose: null,
		minutesUntilOpen: null,
	};
}

function getEntryStatus(entry, currentMinutes) {
	if (!entry || entry.closed) {
		return buildStatus("closed");
	}

	if (entry.openAllDay) {
		return buildStatus("open");
	}

	if (entry.start != null && entry.end != null) {
		const isOvernight = entry.start > entry.end;
		const isOpen = isOvernight
			? currentMinutes >= entry.start || currentMinutes <= entry.end
			: currentMinutes >= entry.start && currentMinutes <= entry.end;

		if (!isOpen) {
			const minutesUntilOpen = currentMinutes < entry.start
				? entry.start - currentMinutes
				: null;

			if (minutesUntilOpen != null && minutesUntilOpen <= 60) {
				return buildStatus("open-soon", null, Math.max(minutesUntilOpen, 0));
			}

			return buildStatus("closed");
		}

		const minutesUntilClose = isOvernight
			? currentMinutes >= entry.start
				? (24 * 60 - currentMinutes) + entry.end
				: entry.end - currentMinutes
			: entry.end - currentMinutes;

		if (minutesUntilClose <= 60) {
			return buildStatus("closing-soon", Math.max(minutesUntilClose, 0));
		}

		return buildStatus("open", minutesUntilClose);
	}

	if (typeof entry.raw === "string") {
		const cleaned = normalizeText(entry.raw);
		if (cleaned.includes("closed")) {
			return buildStatus("closed");
		}

		return buildStatus("open");
	}

	return buildStatus(Boolean(entry.raw) && /open|available|daily|all day|24 hours?/i.test(String(entry.raw)) ? "open" : "closed");
}

export function getRestaurantOperatingStatus(restaurant, referenceDate = new Date()) {
	const operatingHours = restaurant?.operatingHours;
	if (!operatingHours) {
		return buildStatus("closed");
	}

	const targetDate = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
	if (Number.isNaN(targetDate.getTime())) {
		return buildStatus("closed");
	}

	const currentMinutes = targetDate.getHours() * 60 + targetDate.getMinutes();
	const dayEntry = getOperatingHoursForDay(operatingHours, targetDate.getDay());
	const todayStatus = getEntryStatus(dayEntry, currentMinutes);
	if (todayStatus.status !== "closed") {
		return todayStatus;
	}

	const previousDay = new Date(targetDate);
	previousDay.setDate(previousDay.getDate() - 1);
	const previousDayEntry = getOperatingHoursForDay(operatingHours, previousDay.getDay());
	if (previousDayEntry?.start != null && previousDayEntry?.end != null && previousDayEntry.start > previousDayEntry.end) {
		return getEntryStatus(previousDayEntry, currentMinutes);
	}

	return buildStatus("closed");
}
