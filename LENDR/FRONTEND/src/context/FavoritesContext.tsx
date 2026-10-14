/**
 * Favorites context for LENDR.
 *
 * Provides:
 * - Set of favorited equipment IDs for the authenticated student
 * - isFavorited(equipmentId) helper
 * - isToggling(equipmentId) helper for disabling duplicate clicks
 * - toggleFavorite(equipmentId, onRequireAuth) with optimistic UI updates & rollback
 * - Error state with clearError()
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { favoritesApi, ApiError } from '../services/api';
import { useAuth } from './AuthContext';

export interface FavoritesContextValue {
  favoriteIds: Set<string>;
  isLoading: boolean;
  togglingIds: Set<string>;
  isFavorited: (equipmentId: string) => boolean;
  isToggling: (equipmentId: string) => boolean;
  toggleFavorite: (equipmentId: string, onRequireAuth?: () => void) => Promise<boolean>;
  refreshFavorites: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return ctx;
}

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshFavorites = useCallback(async () => {
    if (!user) {
      setFavoriteIds(new Set());
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await favoritesApi.myFavorites({ pageSize: 50 });
      const ids = new Set((res.items ?? []).map((item) => item.id));
      setFavoriteIds(ids);
    } catch (err: unknown) {
      console.warn('Failed to load user favorites:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshFavorites();
    } else {
      setFavoriteIds(new Set());
      setIsLoading(false);
      setError(null);
    }
  }, [user, refreshFavorites]);

  const isFavorited = useCallback(
    (equipmentId: string) => {
      return favoriteIds.has(equipmentId);
    },
    [favoriteIds],
  );

  const isToggling = useCallback(
    (equipmentId: string) => {
      return togglingIds.has(equipmentId);
    },
    [togglingIds],
  );

  const toggleFavorite = useCallback(
    async (equipmentId: string, onRequireAuth?: () => void): Promise<boolean> => {
      if (!user) {
        if (onRequireAuth) {
          onRequireAuth();
        }
        setError('Please sign in with your VIT student account to save favorites.');
        return false;
      }

      if (togglingIds.has(equipmentId)) {
        return false;
      }

      const wasFavorited = favoriteIds.has(equipmentId);

      // Optimistic state transition
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorited) {
          next.delete(equipmentId);
        } else {
          next.add(equipmentId);
        }
        return next;
      });

      setTogglingIds((prev) => new Set(prev).add(equipmentId));
      setError(null);

      try {
        if (wasFavorited) {
          await favoritesApi.removeFavorite(equipmentId);
        } else {
          await favoritesApi.addFavorite(equipmentId);
        }
        return true;
      } catch (err: unknown) {
        // Rollback optimistic state
        setFavoriteIds((prev) => {
          const rollback = new Set(prev);
          if (wasFavorited) {
            rollback.add(equipmentId);
          } else {
            rollback.delete(equipmentId);
          }
          return rollback;
        });

        if (err instanceof ApiError) {
          if (err.status === 403) {
            setError('Only registered VIT students can save favorites.');
          } else if (err.status === 401) {
            setError('Your session has expired. Please sign in again.');
            if (onRequireAuth) {
              onRequireAuth();
            }
          } else if (err.status === 404) {
            setError('This equipment listing is no longer active.');
          } else {
            setError(err.message || 'Could not update favorites. Please try again.');
          }
        } else {
          setError('Network error while updating favorite. Please check your connection.');
        }
        return false;
      } finally {
        setTogglingIds((prev) => {
          const next = new Set(prev);
          next.delete(equipmentId);
          return next;
        });
      }
    },
    [user, favoriteIds, togglingIds],
  );

  const contextValue = useMemo<FavoritesContextValue>(
    () => ({
      favoriteIds,
      isLoading,
      togglingIds,
      isFavorited,
      isToggling,
      toggleFavorite,
      refreshFavorites,
      error,
      clearError,
    }),
    [
      favoriteIds,
      isLoading,
      togglingIds,
      isFavorited,
      isToggling,
      toggleFavorite,
      refreshFavorites,
      error,
      clearError,
    ],
  );

  return (
    <FavoritesContext.Provider value={contextValue}>
      {children}
    </FavoritesContext.Provider>
  );
};
