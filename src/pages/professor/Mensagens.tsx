import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Send,
  Plus,
  MessageCircle,
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Smile,
} from "lucide-react";

export default function ProfessorMensagens() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<number | null>(1);
  const [newMessage, setNewMessage] = useState("");

  const students = [
    {
      id: 1,
      name: "Ana Silva",
      avatar: "/avatars/ana.jpg",
      subject: "Matemática",
      lastMessage: "Obrigada pela explicação sobre derivadas!",
      lastMessageTime: "10:30",
      unreadCount: 2,
      online: true,
    },
    {
      id: 2,
      name: "João Santos",
      avatar: "/avatars/joao.jpg",
      subject: "Física",
      lastMessage: "Pode enviar os exercícios de ontem?",
      lastMessageTime: "09:15",
      unreadCount: 0,
      online: false,
    },
    {
      id: 3,
      name: "Maria Costa",
      avatar: "/avatars/maria.jpg",
      subject: "Matemática",
      lastMessage: "Tenho dúvidas sobre o teste",
      lastMessageTime: "Ontem",
      unreadCount: 1,
      online: true,
    },
    {
      id: 4,
      name: "Pedro Lima",
      avatar: "/avatars/pedro.jpg",
      subject: "Química",
      lastMessage: "Posso reagendar a aula de amanhã?",
      lastMessageTime: "Ontem",
      unreadCount: 0,
      online: false,
    },
    {
      id: 5,
      name: "Carolina Dias",
      avatar: "/avatars/carolina.jpg",
      subject: "Física",
      lastMessage: "Muito obrigada! Já percebi melhor",
      lastMessageTime: "2 dias",
      unreadCount: 0,
      online: false,
    },
  ];

  const messages = [
    {
      id: 1,
      studentId: 1,
      sender: "student",
      content: "Boa tarde, Professor! Tenho uma dúvida sobre o exercício 3 da página 45.",
      timestamp: "14:20",
      read: true,
    },
    {
      id: 2,
      studentId: 1,
      sender: "professor",
      content: "Boa tarde, Ana! Claro, qual é a sua dúvida específica sobre esse exercício?",
      timestamp: "14:22",
      read: true,
    },
    {
      id: 3,
      studentId: 1,
      sender: "student",
      content: "Não estou a conseguir perceber como aplicar a regra da cadeia neste caso.",
      timestamp: "14:25",
      read: true,
    },
    {
      id: 4,
      studentId: 1,
      sender: "professor",
      content: "Entendo. Vamos por partes: primeiro identifica a função exterior e a função interior. A função exterior é f(u) = u³ e a função interior é g(x) = 2x + 1.",
      timestamp: "14:27",
      read: true,
    },
    {
      id: 5,
      studentId: 1,
      sender: "student",
      content: "Ah, agora já percebi! Então f'(u) = 3u² e g'(x) = 2, certo?",
      timestamp: "14:30",
      read: true,
    },
    {
      id: 6,
      studentId: 1,
      sender: "professor",
      content: "Exatamente! E pela regra da cadeia, a derivada será f'(g(x)) × g'(x) = 3(2x+1)² × 2 = 6(2x+1)²",
      timestamp: "14:32",
      read: true,
    },
    {
      id: 7,
      studentId: 1,
      sender: "student",
      content: "Obrigada pela explicação sobre derivadas! Agora já consigo resolver os outros exercícios.",
      timestamp: "14:35",
      read: false,
    },
  ];

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedStudentData = students.find(s => s.id === selectedStudent);
  const studentMessages = messages.filter(m => m.studentId === selectedStudent);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    // Add message logic here
    console.log("Sending message:", newMessage);
    setNewMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      <Helmet>
        <title>Mensagens - Professor | Árvore do Conhecimento</title>
        <meta name="description" content="Comunicar com os seus alunos através de mensagens" />
      </Helmet>

      <div className="h-[calc(100vh-2rem)] flex flex-col p-6 gap-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Mensagens</h1>
            <p className="text-muted-foreground">
              Comunicar com os seus alunos
            </p>
          </div>
          <Button className="bg-gradient-hero hover:opacity-90">
            <Plus className="h-4 w-4 mr-2" />
            Nova Conversa
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
          {/* Students List */}
          <Card className="glass-panel lg:col-span-1">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                Conversas
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar alunos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="space-y-1 p-4 pt-0">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      onClick={() => setSelectedStudent(student.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedStudent === student.id
                          ? "bg-accent/60 border border-border/40"
                          : "hover:bg-accent/30"
                      }`}
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={student.avatar} alt={student.name} />
                          <AvatarFallback className="bg-gradient-hero text-white">
                            {student.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        {student.online && (
                          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 border-2 border-background rounded-full" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-foreground truncate">
                            {student.name}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {student.lastMessageTime}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-sm text-muted-foreground truncate">
                            {student.lastMessage}
                          </p>
                          {student.unreadCount > 0 && (
                            <Badge className="bg-primary text-primary-foreground h-5 w-5 text-xs flex items-center justify-center rounded-full p-0">
                              {student.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs mt-1">
                          {student.subject}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="glass-panel lg:col-span-2 flex flex-col">
            {selectedStudentData ? (
              <>
                {/* Chat Header */}
                <CardHeader className="border-b border-border/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={selectedStudentData.avatar} alt={selectedStudentData.name} />
                          <AvatarFallback className="bg-gradient-hero text-white">
                            {selectedStudentData.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        {selectedStudentData.online && (
                          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 border-2 border-background rounded-full" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{selectedStudentData.name}</CardTitle>
                        <CardDescription>
                          {selectedStudentData.subject} • {selectedStudentData.online ? "Online" : "Offline"}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Video className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Messages */}
                <CardContent className="flex-1 p-4">
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {studentMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.sender === "professor" ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              message.sender === "professor"
                                ? "bg-gradient-hero text-white"
                                : "bg-accent/40 text-foreground"
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                message.sender === "professor"
                                  ? "text-white/70"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {message.timestamp}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>

                {/* Message Input */}
                <div className="border-t border-border/40 p-4">
                  <div className="flex items-end gap-2">
                    <Button variant="ghost" size="sm">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <div className="flex-1">
                      <Textarea
                        placeholder="Escreva a sua mensagem..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="min-h-[44px] resize-none"
                        rows={1}
                      />
                    </div>
                    <Button variant="ghost" size="sm">
                      <Smile className="h-4 w-4" />
                    </Button>
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className="bg-gradient-hero hover:opacity-90"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium text-foreground mb-2">
                    Selecione uma conversa
                  </p>
                  <p className="text-muted-foreground">
                    Escolha um aluno da lista para começar a conversar
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}