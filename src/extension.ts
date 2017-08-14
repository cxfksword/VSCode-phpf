'use strict';

import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs'

class PHPCSFixer {

    private save: boolean;
    private executable: any;
    private style: any;
    private rules: any;
    private indentWithSpace: number;
    private command: vscode.Disposable;
    private saveCommand: vscode.Disposable;

    constructor() {
        let config = vscode.workspace.getConfiguration('phpf');
        this.save = config.get('onsave', false);
        this.executable = config.get('executablePath');
        this.style = config.get("style", ["psr2"]);
        this.rules = config.get("rules", []);
        this.indentWithSpace = config.get("indent_with_space", 0);
    }

    dispose() {
        this.command.dispose();
        this.saveCommand.dispose();
    }

    activate(context: vscode.ExtensionContext) {
        if (this.save) {
            this.saveCommand = vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
                this.format(context.extensionPath, document);
            });
        }

        this.command = vscode.commands.registerTextEditorCommand('phpf.format', (textEditor: vscode.TextEditor) => {
            this.format(context.extensionPath, textEditor.document);
        });

        context.subscriptions.push(this);
    }

    format(extensionPath: any, document: vscode.TextDocument) {
        if (document.languageId !== 'php') {
            return;
        }

        let stdout = '';
        let args = this.getCommandArgs(document.fileName);
        let executable = this.executable;
        if (executable == '') {
            executable = 'php';
            args.splice(0, 0, `${extensionPath}/phpf.phar`);
        }
        let exec = cp.spawn(executable, args);

        exec.stdout.on('data', (buffer: Buffer) => {
            stdout += buffer.toString();
        });

        exec.stderr.on('data', (buffer: Buffer) => {
            console.log(buffer.toString());
        });

        exec.on('close', (code: number) => {
            if (code == 0) {
                return;
            }

            console.warn('phpf: ' + stdout + '.');
            vscode.window.setStatusBarMessage('phpf: ' + stdout + '.', 4000);
            vscode.window.showErrorMessage('phpf: ' + stdout + '.');
        });
    }

    getCommandArgs(fileName: string) {
        let args = [];
        for (var index in this.style) {
            args.push("--" + this.style[index]);
        }

        for (var index in this.rules) {
            args.push(this.rules[index]);
        }

        if (this.indentWithSpace > 0) {
            args.push(`--indent_with_space=${this.indentWithSpace}`);
        }

        args.push(fileName);

        return args;
    }
}

export function activate(context: vscode.ExtensionContext) {
    let phpcsfixer = new PHPCSFixer();
    phpcsfixer.activate(context);
}
