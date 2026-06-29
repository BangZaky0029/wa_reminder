const { initAuthCreds, BufferJSON } = require('@whiskeysockets/baileys');
const supabase = require('../config/supabase');

const useSupabaseAuthState = async () => {
    // Helper to read data from Supabase
    const readData = async (type, id) => {
        const key = `${type}-${id}`;
        try {
            const { data, error } = await supabase
                .from('wa_sessions')
                .select('data')
                .eq('id', key)
                .single();

            if (error || !data) {
                return null;
            }
            return JSON.parse(JSON.stringify(data.data), BufferJSON.reviver);
        } catch (error) {
            console.error(`Error reading auth state (${key}):`, error);
            return null;
        }
    };

    // Helper to write data to Supabase
    const writeData = async (data, type, id) => {
        const key = `${type}-${id}`;
        try {
            const jsonData = JSON.parse(JSON.stringify(data, BufferJSON.replacer));
            const { error } = await supabase
                .from('wa_sessions')
                .upsert(
                    { id: key, data: jsonData, updated_at: new Date().toISOString() },
                    { onConflict: 'id' }
                );

            if (error) {
                console.error(`Error writing auth state (${key}):`, error);
            }
        } catch (error) {
            console.error(`Error writing auth state (${key}):`, error);
        }
    };

    // Helper to remove data from Supabase
    const removeData = async (type, id) => {
        const key = `${type}-${id}`;
        try {
            const { error } = await supabase
                .from('wa_sessions')
                .delete()
                .eq('id', key);

            if (error) {
                console.error(`Error removing auth state (${key}):`, error);
            }
        } catch (error) {
            console.error(`Error removing auth state (${key}):`, error);
        }
    };

    // Initial read for credentials
    let creds = await readData('creds', 'me');
    if (!creds) {
        creds = initAuthCreds();
        await writeData(creds, 'creds', 'me');
    }

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(
                        ids.map(async (id) => {
                            let value = await readData(type, id);
                            if (type === 'app-state-sync-key' && value) {
                                value = require('@whiskeysockets/baileys').proto.Message.AppStateSyncKeyData.fromObject(value);
                            }
                            data[id] = value;
                        })
                    );
                    return data;
                },
                set: async (data) => {
                    const upserts = [];
                    const deletes = [];

                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            if (value) {
                                const jsonData = JSON.parse(JSON.stringify(value, BufferJSON.replacer));
                                upserts.push({ id: key, data: jsonData, updated_at: new Date().toISOString() });
                            } else {
                                deletes.push(key);
                            }
                        }
                    }

                    // Proses hapus data (jika ada)
                    for (const key of deletes) {
                        await supabase.from('wa_sessions').delete().eq('id', key);
                    }

                    // Proses insert/update data secara batch (100 baris per request) untuk mencegah Timeout Error
                    const chunkSize = 100;
                    for (let i = 0; i < upserts.length; i += chunkSize) {
                        const chunk = upserts.slice(i, i + chunkSize);
                        try {
                            const { error } = await supabase.from('wa_sessions').upsert(chunk, { onConflict: 'id' });
                            if (error) {
                                console.error(`[DB] Error batch writing auth state:`, error.message);
                            }
                        } catch (err) {
                            console.error(`[DB] Fetch error batch writing auth state:`, err.message);
                        }
                    }
                }
            }
        },
        saveCreds: () => writeData(creds, 'creds', 'me')
    };
};

module.exports = { useSupabaseAuthState };
