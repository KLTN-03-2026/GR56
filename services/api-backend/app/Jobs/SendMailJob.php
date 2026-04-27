<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;

class SendMailJob implements ShouldQueue
{
    use Queueable;

    public $email;
    public $title;
    public $view;
    public $data;
    public function __construct($email, $title, $view, $data)
    {
        $this->email = $email;
        $this->title = $title;
        $this->view = $view;
        $this->data = $data;
    }

    public function handle(): void
    {
        Mail::to($this->email)->send(new \App\Mail\MasterMail($this->title, $this->view, $this->data));
    }
}
