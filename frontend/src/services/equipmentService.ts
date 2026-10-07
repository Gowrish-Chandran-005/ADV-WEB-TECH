import { supabase } from '../lib/supabase/client';

export interface EquipmentCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  created_at: string;
}

export interface EquipmentOwnerProfile {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
}

export interface EquipmentRecord {
  id: string;
  owner_id: string;
  category_id: string;
  name: string;
  description: string | null;
  brand: string | null;
  model: string | null;
  condition: string;
  status: string;
  price_per_day: number | null;
  security_deposit: number | null;
  location: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  category?: EquipmentCategory | null;
  owner?: EquipmentOwnerProfile | null;
}

export interface EquipmentImage {
  id: string;
  equipment_id: string;
  image_url: string;
  storage_path: string | null;
  display_order: number | null;
  created_at: string;
}

export interface EquipmentAvailability {
  id: string;
  equipment_id: string;
  start_date: string;
  end_date: string;
  is_available: boolean;
  created_at: string;
}

export async function getCategories(): Promise<EquipmentCategory[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase.from('categories').select('*').order('name');

  if (error) {
    throw new Error(`Failed to load categories: ${error.message}`);
  }

  return (data ?? []) as EquipmentCategory[];
}

export async function getPublishedEquipment(): Promise<EquipmentRecord[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load published equipment: ${error.message}`);
  }

  return (data ?? []) as EquipmentRecord[];
}

export async function getEquipmentById(id: string): Promise<EquipmentRecord | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load equipment: ${error.message}`);
  }

  return (data as EquipmentRecord | null) ?? null;
}

export async function getOwnerEquipment(ownerId: string): Promise<EquipmentRecord[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load your equipment: ${error.message}`);
  }

  return (data ?? []) as EquipmentRecord[];
}

export async function createEquipment(input: {
  name: string;
  category_id: string;
  brand?: string | null;
  model?: string | null;
  description?: string | null;
  condition: string;
  price_per_day: number;
  security_deposit: number;
  location?: string | null;
  is_published?: boolean;
}) {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.');
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('You must be signed in to add equipment.');
  }

  const { data, error } = await supabase
    .from('equipment')
    .insert({
      owner_id: user.id,
      category_id: input.category_id,
      name: input.name,
      brand: input.brand ?? null,
      model: input.model ?? null,
      description: input.description ?? null,
      condition: input.condition,
      status: 'available',
      price_per_day: input.price_per_day,
      security_deposit: input.security_deposit,
      location: input.location ?? null,
      is_published: input.is_published ?? true,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to create equipment: ${error.message}`);
  }

  return data as EquipmentRecord;
}

export async function updateEquipment(
  id: string,
  updates: Partial<{
    name: string;
    category_id: string;
    brand: string | null;
    model: string | null;
    description: string | null;
    condition: string;
    price_per_day: number;
    security_deposit: number;
    location: string | null;
    is_published: boolean;
  }>
): Promise<EquipmentRecord> {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.');
  }

  const { data, error } = await supabase
    .from('equipment')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to update equipment: ${error.message}`);
  }

  return data as EquipmentRecord;
}

export async function deleteEquipment(id: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.');
  }

  const { error } = await supabase.from('equipment').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to delete equipment: ${error.message}`);
  }
}

export async function publishEquipment(id: string, nextPublishedState: boolean): Promise<EquipmentRecord> {
  return updateEquipment(id, { is_published: nextPublishedState });
}

export async function addEquipmentImage(
  equipmentId: string,
  file: File,
  displayOrder = 0
): Promise<EquipmentImage> {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.');
  }

  const safeFileName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
  const storagePath = `${equipmentId}/${safeFileName}`;

  const { error: uploadError } = await supabase.storage
    .from('equipment-images')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });

  if (uploadError) {
    if (/bucket|not found/i.test(uploadError.message)) {
      throw new Error("Supabase Storage bucket 'equipment-images' is not configured yet. Create it in Supabase Storage to enable equipment photos.");
    }
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  const publicUrl = supabase.storage.from('equipment-images').getPublicUrl(storagePath).data?.publicUrl;

  if (!publicUrl) {
    throw new Error('Image upload completed but the public URL could not be generated.');
  }

  const { data, error } = await supabase
    .from('equipment_images')
    .insert({
      equipment_id: equipmentId,
      image_url: publicUrl,
      storage_path: storagePath,
      display_order: displayOrder,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to save the uploaded image: ${error.message}`);
  }

  return data as EquipmentImage;
}

export async function getEquipmentImages(equipmentId: string): Promise<EquipmentImage[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('equipment_images')
    .select('*')
    .eq('equipment_id', equipmentId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to load equipment images: ${error.message}`);
  }

  return (data ?? []) as EquipmentImage[];
}

export async function deleteEquipmentImage(imageId: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.');
  }

  const { data: image, error: loadError } = await supabase
    .from('equipment_images')
    .select('*')
    .eq('id', imageId)
    .maybeSingle();

  if (loadError) {
    throw new Error(`Failed to find the selected image: ${loadError.message}`);
  }

  if (image?.storage_path) {
    const { error: storageError } = await supabase.storage
      .from('equipment-images')
      .remove([image.storage_path]);

    if (storageError) {
      console.error('Failed to delete storage asset', storageError);
    }
  }

  const { error } = await supabase.from('equipment_images').delete().eq('id', imageId);

  if (error) {
    throw new Error(`Failed to delete image: ${error.message}`);
  }
}

export async function getEquipmentAvailability(equipmentId: string): Promise<EquipmentAvailability[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('equipment_availability')
    .select('*')
    .eq('equipment_id', equipmentId)
    .order('start_date', { ascending: true });

  if (error) {
    throw new Error(`Failed to load equipment availability: ${error.message}`);
  }

  return (data ?? []) as EquipmentAvailability[];
}

export async function createAvailability(input: {
  equipment_id: string;
  start_date: string;
  end_date: string;
  is_available: boolean;
}): Promise<EquipmentAvailability> {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.');
  }

  const { data, error } = await supabase
    .from('equipment_availability')
    .insert({
      equipment_id: input.equipment_id,
      start_date: input.start_date,
      end_date: input.end_date,
      is_available: input.is_available,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to create availability record: ${error.message}`);
  }

  return data as EquipmentAvailability;
}

export async function updateAvailability(
  id: string,
  updates: Partial<{ start_date: string; end_date: string; is_available: boolean }>
): Promise<EquipmentAvailability> {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.');
  }

  const { data, error } = await supabase
    .from('equipment_availability')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to update availability: ${error.message}`);
  }

  return data as EquipmentAvailability;
}

export async function deleteAvailability(id: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.');
  }

  const { error } = await supabase.from('equipment_availability').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to delete availability: ${error.message}`);
  }
}
