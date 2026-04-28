const supabase = require("../database/supabase");

function getAgeGroup(age) {
  if (age <= 12) return "child";
  if (age <= 19) return "teenager";
  if (age <= 59) return "adult";
  return "senior";
}

async function findByName(name) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .ilike("name", name)
    .maybeSingle();

  if (error) return null;
  return data;
}

async function findById(id) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return null;
  return data;
}

async function createProfile(id, name, data) {
  const age_group = getAgeGroup(data.age);
  const created_at = new Date().toISOString();

  const { data: inserted, error } = await supabase
    .from("profiles")
    .insert([
      {
        id,
        name,
        gender: data.gender,
        gender_probability: data.gender_probability,
        sample_size: data.sample_size,
        age: data.age,
        age_group,
        country_id: data.country_id,
        country_probability: data.country_probability,
        created_at,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  return inserted;
}

async function listProfiles(filters) {
  let query = supabase.from("profiles").select("*");

  if (filters.gender) {
    query = query.ilike("gender", filters.gender);
  }

  if (filters.country_id) {
    query = query.ilike("country_id", filters.country_id);
  }

  if (filters.age_group) {
    query = query.ilike("age_group", filters.age_group);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}

async function deleteProfile(id) {
  const { error } = await supabase.from("profiles").delete().eq("id", id);

  return !error;
}

module.exports = {
  getAgeGroup,
  findByName,
  findById,
  createProfile,
  listProfiles,
  deleteProfile,
};
