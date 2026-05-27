/**
 * Anvil - gerenciador de estado reativo simples
 *
 * Uso:
 *   const store = createStore({ count: 0 });
 *   store.subscribe((state) => console.log(state.count));
 *   store.set({ count: 1 }); // notifica subscribers
 *   store.get()              // retorna estado atual
 */

export function createStore(initialState = {}) {
    let _state = { ...initialState };
    const _subscribers = new Set();

    return {
        get: () => ({ ..._state }),

        set: (partial) => {
            _state = { ..._state, ...partial };
            _subscribers.forEach(fn => fn({ ..._state }));
        },

        subscribe: (fn) => {
            _subscribers.add(fn);
            return () => _subscribers.delete(fn);
        },

        reset: () => {
            _state = { ...initialState };
            _subscribers.forEach(fn => fn({ ..._state }));
        },
    };
}