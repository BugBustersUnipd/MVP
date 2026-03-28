import { Result } from './result.model';

export interface ResultAiAssistant extends Result {
	title: string;
	content: string;
	imagePath: string | null;
	tone: Tone;
	style: Style;
	company: Company;
	data: Date;
	prompt: string;
	evaluation: number;
	isPost: boolean;
}

export interface Style {
	id: number;
	name: string;
}

export interface Tone {
	id: number;
	name: string;
}

export interface Company {
	id: number;
	name: string;
}
