import {
  BadGatewayException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Res,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { IsString, Length } from 'class-validator';
import type { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';

class SpeakDto {
  @IsString()
  @Length(1, 1200)
  text!: string;
}

const config = () => {
  const key = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!key || !agentId) {
    throw new ServiceUnavailableException(
      'Voice assistant is not configured. Set ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID.',
    );
  }
  return { key, agentId };
};

// Spoken replies use the voice the agent is set up with, unless ELEVENLABS_VOICE_ID says otherwise.
let agentVoice: string | undefined;
async function voiceId(key: string, agentId: string): Promise<string> {
  if (process.env.ELEVENLABS_VOICE_ID) return process.env.ELEVENLABS_VOICE_ID;
  if (agentVoice) return agentVoice;
  const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${encodeURIComponent(agentId)}`, {
    headers: { 'xi-api-key': key },
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  const body = (await res?.json().catch(() => null)) as { conversation_config?: { tts?: { voice_id?: string } } } | null;
  const id = body?.conversation_config?.tts?.voice_id;
  if (!res?.ok || !id) throw new BadGatewayException('The assistant voice could not be found');
  agentVoice = id;
  return id;
}

// The ElevenLabs key stays here. The browser only receives a signed session URL, or audio for one reply.
@Controller('voice')
@UseGuards(AuthGuard)
export class VoiceController {
  @Get('signed-url')
  async signedUrl() {
    const { key, agentId } = config();

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

  // Text in, spoken audio out. The student types or dictates the question; only the reply is spoken.
  @Post('speak')
  @HttpCode(200)
  async speak(@Body() dto: SpeakDto, @Res() out: Response) {
    const { key, agentId } = config();
    const voice = await voiceId(key, agentId);

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_64`,
      {
        method: 'POST',
        headers: { 'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg' },
        body: JSON.stringify({ text: dto.text, model_id: 'eleven_flash_v2_5' }),
        signal: AbortSignal.timeout(30_000),
      },
    ).catch(() => null);
    if (!res?.ok) throw new BadGatewayException('The reply could not be turned into speech');

    out.set({ 'content-type': 'audio/mpeg', 'cache-control': 'no-store' });
    out.send(Buffer.from(await res.arrayBuffer()));
  }
}
