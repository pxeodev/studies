const addToClipboard = async (text) => {
  await navigator.clipboard.writeText(text);
}

export default addToClipboard