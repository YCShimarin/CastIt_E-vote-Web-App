const syncTemplate = async () => {
    try {
        const res = await fetch('/web_config.json');
        if (res.ok) {
            const config = await res.json();
            
            // 1. Update Title & Favicon
            if (config.website) {
                if (config.website.name) {
                    // Update document title
                    document.title = config.website.name;
                    
                    // Update Nav Title (Assume the last text node or specific span in .logo)
                    const navLinks = document.querySelectorAll('nav .logo, .error-footer a:last-child');
                    navLinks.forEach(link => {
                        // If it has an image, keep the image and just replace the text
                        const img = link.querySelector('img');
                        if (img) {
                            link.innerHTML = '';
                            link.appendChild(img);
                            link.appendChild(document.createTextNode(' ' + config.website.name));
                        } else {
                            link.textContent = config.website.name;
                        }
                    });
                }
                if (config.website.logo_path) {
                    const favicons = document.querySelectorAll('link[rel="icon"]');
                    favicons.forEach(icon => icon.href = config.website.logo_path);
                    
                    const navLogos = document.querySelectorAll('nav .logo img, .error-footer img');
                    navLogos.forEach(img => img.src = config.website.logo_path);
                }
            }
            
            // 2. Update Footer
            if (config.additional_settings && config.additional_settings.footer_text) {
                const footers = document.querySelectorAll('footer p');
                footers.forEach(p => {
                    p.textContent = config.additional_settings.footer_text;
                });
            }
        }
    } catch (e) {
        console.error('Gagal memuat web_config untuk sinkronisasi template', e);
    }
};

document.addEventListener('DOMContentLoaded', syncTemplate);
