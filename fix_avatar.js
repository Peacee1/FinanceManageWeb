const fs = require('fs');
const file = 'c:/Users/Admin/Downloads/webquanlychitieu/frontend/src/pages/Dashboard.jsx';
let c = fs.readFileSync(file, 'utf8');

const compressBlob = \  const compressBlob = (blob, maxSizeMB = 1) => {
    return new Promise((resolve) => {
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      const img = new Image();
      img.src = URL.createObjectURL(blob);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxDim = 1200;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width *= ratio;
          height *= ratio;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        let quality = 0.9;
        const compress = () => {
          canvas.toBlob((newBlob) => {
            if (newBlob.size <= maxSizeBytes || quality <= 0.3) resolve(newBlob);
            else { quality -= 0.15; compress(); }
          }, 'image/jpeg', quality);
        };
        compress();
      };
    });
  };\;

const newHandleCropComplete = \  const handleCropComplete = async () => {
    if (!croppedAreaPixels || !avatarImage) return;
    try {
      setLoading(true);
      let blob = await getCroppedImg(avatarImage, croppedAreaPixels);

      if (blob.size > 1024 * 1024) {
          blob = await compressBlob(blob, 1);
      }

      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });

      if (cropTarget === 'profile') {
        const formData = new FormData();
        formData.append('avatar', file);
        const token = localStorage.getItem('token');
        await axios.post('/api/users/update-avatar', formData, {
          headers: { Authorization: \\\Bearer \\\\\\, 'Content-Type': 'multipart/form-data' }
        });
        fetchProfile(); 
      } else if (cropTarget === 'biz') {
        setBizAvatarFile(file);
        setBizAvatarPreview(URL.createObjectURL(file));
      } else if (cropTarget === 'emp') {
        setEmpAvatarFile(file);
        setEmpAvatarPreview(URL.createObjectURL(file));
      } else if (cropTarget === 'prod') {
        setProdAvatarFile(file);
        setProdAvatarPreview(URL.createObjectURL(file));
      }
      setIsCropModalOpen(false);
      setAvatarImage(null);
    } catch (error) {
      alert('L?i luu ?nh');
    } finally { setLoading(false); }
  };\;

c = c.replace(
  /const handleCropComplete = async \(\) => {[\s\S]*?finally { setLoading\(false\); }[\s\S]*?};/,
  compressBlob + '\n\n' + newHandleCropComplete
);

fs.writeFileSync(file, c);
console.log('Script executed successfully!');
