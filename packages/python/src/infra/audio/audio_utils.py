def podcast_audio_postprocess(
    waveform,
    sample_rate=24000,
):
    """
    Post-process audio to simulate a high-quality podcast voice."""
    import torchaudio.functional as F
    import torch

    # 1. High-pass filter to remove sub-bass rumble
    waveform = F.highpass_biquad(waveform, sample_rate=sample_rate, cutoff_freq=80)

    # 2. SM7B-inspired EQ profile with preamp coloration
    # Add proximity effect boost (deep bass presence like SM7B)
    waveform = F.equalizer_biquad(
        waveform, sample_rate, center_freq=120, gain=6.0, Q=0.8
    )

    # Add warmth and body (low-mids)
    waveform = F.equalizer_biquad(
        waveform, sample_rate, center_freq=250, gain=4.0, Q=0.7
    )

    # Subtle presence boost (for clarity)
    waveform = F.equalizer_biquad(
        waveform, sample_rate, center_freq=3000, gain=2.0, Q=0.8
    )

    # Cut nasal tones / harshness
    waveform = F.equalizer_biquad(
        waveform, sample_rate, center_freq=1200, gain=-4.5, Q=1.2
    )

    # Roll off excessive highs (like SM7B's natural roll-off)
    waveform = F.equalizer_biquad(
        waveform, sample_rate, center_freq=8000, gain=-3.0, Q=0.7
    )

    # 3. Subtle compression (simulating preamp)
    threshold = 0.5
    ratio = 3.0
    attack = 5.0  # ms
    release = 50.0  # ms

    # Simple compression implementation
    abs_waveform = torch.abs(waveform)
    gain_mask = abs_waveform > threshold
    gain_reduction = torch.zeros_like(waveform)
    gain_reduction[gain_mask] = (abs_waveform[gain_mask] - threshold) * (1 - 1 / ratio)

    # Apply smooth attack/release (simplified)
    compressed = waveform - torch.sign(waveform) * gain_reduction

    # 4. Add subtle harmonic saturation (tube preamp simulation)
    drive = 0.2
    saturation = torch.tanh(compressed * (1 + drive)) / (1 + drive * 0.5)

    # 5. Normalize to -1dB peak (leaving headroom)
    peak = saturation.abs().max()
    if peak > 0:
        target_peak = 0.89  # -1dB peak
        saturation = saturation * (target_peak / peak)

    return saturation
