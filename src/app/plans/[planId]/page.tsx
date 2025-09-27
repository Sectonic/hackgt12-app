import Editor from "./editor";

interface EditorPage {
    params: {
        planId: string;
    };
}

export default async function EditorPage({ params }: EditorPage) {
    const { planId } = await params;

    console.log(planId);
    
    return <Editor />;
}