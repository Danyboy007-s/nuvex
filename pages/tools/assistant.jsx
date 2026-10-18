import Layout from "../../components/Layout";
import AssistantChat from "../../components/AssistantChat";
import { toolPageSeo } from "../../lib/tools";

// Nuvex IA dentro del panel de herramientas (y en su propia URL /tools/assistant).
// La interfaz es components/AssistantChat.jsx; las respuestas, lib/assistant.js.
export default function AssistantPage({ standalone = false }) {
  const content = (
    <div className="max-w-2xl mx-auto">
      <AssistantChat variant="panel" />
    </div>
  );
  if (standalone) return content;
  return <Layout {...toolPageSeo("assistant")}>{content}</Layout>;
}
