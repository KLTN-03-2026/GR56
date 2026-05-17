<?php

namespace App\Http\Controllers;

use App\Models\ChatbotSession;
use App\Models\ChatbotAnalytic;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class ChatbotSessionController extends Controller
{
    public function start(Request $request)
    {
        try {
            $idKhachHang = $request->input('id_khach_hang');
            $sessionToken = $request->input('session_token');

            // Nếu có session_token cũ → resume session
            if ($sessionToken) {
                $existing = ChatbotSession::where('session_token', $sessionToken)
                    ->where('trang_thai', 'active')
                    ->first();
                if ($existing) {
                    return response()->json([
                        'status' => true,
                        'session_id' => $existing->id,
                        'session_token' => $existing->session_token,
                        'messages' => $existing->messages ?? [],
                        'resumed' => true,
                    ]);
                }
            }

            // Tạo session mới
            $newToken = $sessionToken ?? Str::random(40);
            $session = ChatbotSession::create([
                'id_khach_hang' => $idKhachHang,
                'session_token' => $newToken,
                'messages' => [],
                'trang_thai' => 'active',
                'started_at' => now(),
            ]);

            return response()->json([
                'status' => true,
                'session_id' => $session->id,
                'session_token' => $session->session_token,
                'messages' => [],
                'resumed' => false,
            ]);
        } catch (\Exception $e) {
            Log::error('ChatbotSession start error: ' . $e->getMessage());
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function addMessage(Request $request, $sessionId)
    {
        try {
            $session = ChatbotSession::find($sessionId);
            if (!$session) {
                return response()->json(['status' => false, 'message' => 'Session not found'], 404);
            }

            $role = $request->input('role', 'user');
            $content = $request->input('content', '');
            $meta = $request->input('meta', []);

            $messages = $session->messages ?? [];
            $messages[] = array_merge([
                'role' => $role,
                'content' => $content,
                'timestamp' => now()->toIso8601String(),
            ], $meta);
            $session->messages = $messages;
            $session->save();

            // Ghi analytic nếu là user message
            if ($role === 'user') {
                $this->logAnalytic($session, $content, $meta);
            }

            return response()->json(['status' => true, 'message_count' => count($messages)]);
        } catch (\Exception $e) {
            Log::error('ChatbotSession addMessage error: ' . $e->getMessage());
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function getSession($sessionId)
    {
        try {
            $session = ChatbotSession::with('khachHang:id,ho_va_ten,so_dien_thoai')
                ->find($sessionId);
            if (!$session) {
                return response()->json(['status' => false, 'message' => 'Session not found'], 404);
            }
            return response()->json([
                'status' => true,
                'session' => $session,
            ]);
        } catch (\Exception $e) {
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function closeSession($sessionId)
    {
        try {
            $session = ChatbotSession::find($sessionId);
            if (!$session) {
                return response()->json(['status' => false, 'message' => 'Session not found'], 404);
            }
            $session->trang_thai = 'closed';
            $session->ended_at = now();
            $session->save();

            return response()->json(['status' => true, 'message' => 'Session closed']);
        } catch (\Exception $e) {
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    private function logAnalytic(ChatbotSession $session, string $content, array $meta)
    {
        try {
            $intent = $meta['intent'] ?? 'unknown';
            $entities = $meta['entities'] ?? [];
            $responseType = $meta['response_type'] ?? 'text';

            ChatbotAnalytic::create([
                'id_khach_hang' => $session->id_khach_hang,
                'session_id' => $session->id,
                'intent' => $intent,
                'entities' => $entities,
                'response_type' => $responseType,
                'converted' => false,
                'message_preview' => mb_substr($content, 0, 255),
            ]);
        } catch (\Exception $e) {
            Log::warning('Failed to log chatbot analytic: ' . $e->getMessage());
        }
    }
}
