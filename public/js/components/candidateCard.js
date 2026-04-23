export const createCandidateCard = (candidate, onVote, hasVoted, userVote) => {
    const card = document.createElement('div');
    const isVotedThisCard = userVote === candidate.id;
    card.className = 'candidate-card' + (isVotedThisCard ? ' voted-card' : '');

    const btnLabel = isVotedThisCard
        ? '<i class="fas fa-check-circle"></i> Pilihan Anda'
        : hasVoted
            ? 'Voting Selesai'
            : '<i class="fas fa-vote-yea"></i> Pilih Kandidat';

    const btnClass = isVotedThisCard
        ? 'btn btn-voted'
        : 'btn btn-primary';

    // Extract candidate number from id (kandidat_1 → 01)
    const num = candidate.id.split('_')[1];

    card.innerHTML = `
        <img src="${candidate.foto}" alt="${candidate.nama}" class="candidate-img">
        <div class="candidate-info">
            <span class="candidate-tag${isVotedThisCard ? ' voted-badge' : ''}">Kandidat 0${num}</span>
            <h3 style="margin-top: 10px;">${candidate.nama}</h3>
            <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 16px; min-height: 42px;">${candidate.deskripsi}</p>
            <p style="font-size: 0.8rem; color: var(--primary); margin-bottom: 14px;"><i class="fas fa-eye"></i> Klik kartu untuk lihat Visi &amp; Misi</p>
            <button class="${btnClass}" id="vote-btn-${candidate.id}" ${hasVoted ? 'disabled' : ''} style="width: 100%; justify-content: center;">
                ${btnLabel}
            </button>
        </div>
    `;

    card.querySelector(`#vote-btn-${candidate.id}`).addEventListener('click', (e) => {
        e.stopPropagation();
        if (!hasVoted) onVote(candidate.id);
    });

    card.addEventListener('click', () => showCandidateModal(candidate));

    return card;
};

const showCandidateModal = (candidate) => {
    const modal = document.getElementById('candidate-modal');
    const body = document.getElementById('modal-body');
    const num = candidate.id.split('_')[1];

    const misiHtml = (candidate.misi || []).map((m, i) =>
        `<li><span class="num">${i + 1}</span>${m}</li>`
    ).join('');

    body.innerHTML = `
        <div class="modal-header">
            <img src="${candidate.foto}" class="modal-avatar" alt="${candidate.nama}">
            <div>
                <span class="modal-tag">Kandidat 0${num}</span>
                <h2>${candidate.nama}</h2>
                <p style="font-size: 0.85rem; color: var(--text-muted);">${candidate.deskripsi}</p>
            </div>
        </div>
        <h4 style="font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; color: var(--primary); margin-bottom: 10px;">
            <i class="fas fa-eye"></i> Visi
        </h4>
        <p style="color: var(--text-dark); background: var(--primary-light); padding: 14px 18px; border-radius: 10px; font-size: 0.9rem; margin-bottom: 24px;">
            "${candidate.visi || 'Visi belum tersedia.'}"
        </p>
        <h4 style="font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; color: var(--primary); margin-bottom: 10px;">
            <i class="fas fa-list-check"></i> Misi
        </h4>
        <ul class="misi-list">${misiHtml}</ul>
    `;

    modal.classList.add('open');

    // Handle Closing (Added this logic)
    const closeBtn = document.getElementById('close-modal-btn');
    const closeModal = () => modal.classList.remove('open');
    
    if (closeBtn) closeBtn.onclick = closeModal;
    
    // Close on click outside
    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };
};
