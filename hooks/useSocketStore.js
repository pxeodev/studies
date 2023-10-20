import { create } from 'zustand'

const socketStore = create((set) => ({
    socket: null,
    setSocket: (socket) => set({ socket }),
}));

export default socketStore;
