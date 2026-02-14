let originalImage = null;
        let imagePreview = document.getElementById('imagePreview');

        // Handle image upload
        document.getElementById('imageInput').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    imagePreview.src = event.target.result;
                    originalImage = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });

        // Convert and download
        function convertImage() {
            if (!originalImage) return;
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.src = originalImage;
            
            const format = document.getElementById('formatSelect').value;
            
            img.onload = function() {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0, img.width, img.height);
                
                const dataUrl = canvas.toDataURL(`image/${format}`);
                const link = document.createElement('a');
                link.download = `converted_image.${format}`;
                link.href = dataUrl;
                link.click();
            };
        }