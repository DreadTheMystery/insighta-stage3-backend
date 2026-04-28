const { generateUuidV7 } = require("../utils/uuid");
const {
  findByName,
  findById,
  createProfile,
  listProfiles,
  deleteProfile,
  getAgeGroup,
} = require("../models/profileModel");
const { fetchProfileData } = require("../services/externalApisService");

function validateNameInput(name) {
  if (name === undefined || name === null || name === "") {
    return {
      isValid: false,
      statusCode: 400,
      message: "Missing or empty name",
    };
  }

  if (typeof name !== "string") {
    return {
      isValid: false,
      statusCode: 422,
      message: "Invalid type for name",
    };
  }

  const trimmed = name.trim();

  if (!trimmed) {
    return {
      isValid: false,
      statusCode: 400,
      message: "Missing or empty name",
    };
  }

  return {
    isValid: true,
    name: trimmed,
  };
}

async function createProfileHandler(req, res) {
  // Admin only
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      status: "error",
      message: "Admin access required",
    });
  }

  const validation = validateNameInput(req.body && req.body.name);

  if (!validation.isValid) {
    return res.status(validation.statusCode).json({
      status: "error",
      message: validation.message,
    });
  }

  const name = validation.name;

  try {
    const existing = await findByName(name);
    if (existing) {
      return res.status(200).json({
        status: "success",
        message: "User already available",
        data: existing,
      });
    }

    const data = await fetchProfileData(name);

    const id = generateUuidV7();
    const profile = await createProfile(id, name, data);

    return res.status(201).json({
      status: "success",
      data: profile,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("createProfileHandler error FULL:", error);

    if (error.statusCode === 502) {
      return res.status(502).json({
        status: "error",
        message: error.message,
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Upstream or server failure",
    });
  }
}

async function getSingleProfileHandler(req, res) {
  // Both admin and analyst can view
  if (!req.user) {
    return res.status(401).json({
      status: "error",
      message: "Authentication required",
    });
  }

  const { id } = req.params;
  const profile = await findById(id);

  if (!profile) {
    return res.status(404).json({
      status: "error",
      message: "Profile not found",
    });
  }

  return res.status(200).json({
    status: "success",
    data: profile,
  });
}

async function getAllProfilesHandler(req, res) {
  // Both admin and analyst can list
  if (!req.user) {
    return res.status(401).json({
      status: "error",
      message: "Authentication required",
    });
  }

  const { gender, country_id, age_group, page = "1", limit = "20" } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const profiles = await listProfiles({ gender, country_id, age_group });

  const paginatedProfiles = profiles.slice(offset, offset + limitNum);

  const data = paginatedProfiles.map((p) => ({
    id: p.id,
    name: p.name,
    gender: p.gender,
    age: p.age,
    age_group: getAgeGroup(p.age),
    country_id: p.country_id,
  }));

  return res.status(200).json({
    status: "success",
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: profiles.length,
      totalPages: Math.ceil(profiles.length / limitNum),
    },
    data,
  });
}

async function deleteProfileHandler(req, res) {
  // Admin only
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      status: "error",
      message: "Admin access required",
    });
  }

  const { id } = req.params;

  const deleted = await deleteProfile(id);

  if (!deleted) {
    return res.status(404).json({
      status: "error",
      message: "Profile not found",
    });
  }

  return res.status(204).send();
}

module.exports = {
  createProfileHandler,
  getSingleProfileHandler,
  getAllProfilesHandler,
  deleteProfileHandler,
};
