const uploadToPinata = async (file) => {
  if (!file) return null;

  const formData = new FormData();
  formData.append('file', file);

  const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
  const pinataSecretApiKey = process.env.NEXT_PUBLIC_PINATA_API_SECRET;

  try {
    const res = await fetch(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      {
        method: 'POST',
        headers: {
          'pinata_api_key': pinataApiKey,
          'pinata_secret_api_key': pinataSecretApiKey,
        },
        body: formData,
      }
    );

    if (!res.ok) {
      console.error('Pinata Error:', await res.text());
      throw new Error(`Pinata Error: ${res.status}`);
    }

    const data = await res.json();
    return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
  } catch (error) {
    console.error('Error uploading to Pinata:', error);
    throw new Error('Failed to upload image');
  }
};



export { uploadToPinata }; 