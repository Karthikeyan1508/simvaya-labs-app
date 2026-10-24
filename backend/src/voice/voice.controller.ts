import { BadGatewayException, Controller, Get, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';

// The ElevenLabs key stays here. The browser only receives a signed session URL.
@Controller('voice')
@UseGuards(AuthGuard)
export class VoiceController {
  @Get('signed-url')
  async signedUrl() {
    const key = process.env.ELEVENLABS_API_KEY;
    const agentId = process.env.ELEVENLABS_AGENT_ID;
    if (!key || !agentId) {
      throw new ServiceUnavailableException(
        'Voice assistant is not configured. Set ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID.',
      );
    }

    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { 'xi-api-key': key }, signal: AbortSignal.timeout(10_000) },
    ).catch(() => null);
    if (!res) throw new BadGatewayException('Voice assistant could not be reached');

    const body = (await res.json().catch(() => null)) as { signed_url?: unknown } | null;
    const signed = body?.signed_url;
    if (!res.ok || typeof signed !== 'string') {
      throw new BadGatewayException('Voice assistant did not return a session');
    }
    return { signedUrl: signed };
  }
}
