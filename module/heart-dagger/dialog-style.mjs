export const SYSTEM_DIALOG_CLASSES = Object.freeze(['daggerheart', 'dh-style', 'dialog']);

export function applySystemDialogStyle(element) {
    element.classList.add(...SYSTEM_DIALOG_CLASSES);
}

export function systemDialogClasses(classes = []) {
    return Array.from(new Set([...SYSTEM_DIALOG_CLASSES, ...classes]));
}
