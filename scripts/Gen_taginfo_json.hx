/**
 *
 * @license AGPLv3 <https://www.gnu.org/licenses/agpl-3.0.html>
 * @author Copyright (C) 2015-2025 Robin Schneider <ypid@riseup.net>
 *
 *  Generate taginfo.json for this project.
 *  See: https://wiki.openstreetmap.org/wiki/Taginfo/Projects

 *  haxe -main Gen_taginfo_json -lib hxargs -neko Gen_taginfo_json.n && neko Gen_taginfo_json --key-file related_tags.txt --template-file taginfo_template.json > taginfo.json

 *  Confirmed working for targets:
 *  * Neko
 *  * Java
 *  * C++
 *  * PHP (also produces the exact same output as gen_taginfo_json.js does ;) )

 *  Not working for:
 *  * Python3 (able to show help, `type object 'HxOverrides' has no attribute 'arrayGet'` error when trying to doing the real work)
 *  * JavaScript (Sys implementation not yet complete: -lib nodejs)
 *
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, version 3 of the
 * License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */

import haxe.Json;
import sys.io.File;

class Gen_taginfo_json {
    private var key_file:String;
    private var template_file:String;
    private var help_text:String;
    private var return_code = new Map<String, Int>();

    public function new() {
        return_code.set('missing args', 1);
    }

    public function help() {
        Sys.println(help_text);
        Sys.exit(0);
    }

    public function gen_taginfo() {
        if(this.key_file == null) {
            throw('key_file is null but required by this function');
        }

        var keys = new Array<String>();

        var key_fh = File.read(key_file, false /* non-binary mode */);
        var osm_key_re = new EReg('^[\\w:_-]+$', "i");
        while (true) {

            var osm_tag_key;
            try {
                osm_tag_key = key_fh.readLine();
            } catch (e:haxe.io.Eof) { break; }
            if (osm_key_re.match(osm_tag_key)) {
                keys.push(osm_tag_key);
            }
        }

        if(template_file != null) {
            var value = File.getContent(this.template_file),
                template_data  = Json.parse(value);
            var key_description:String = "";

            /* Copy JSON TObject to dynamic map because TObject does not allow
             * type change which is needed later in this code. */
            var output_date = new Map<String, Dynamic>();
            for (key in Reflect.fields(template_data)) {
                output_date[key] = Reflect.getProperty(template_data, key);
            }

            if (Std.is(output_date.get('tags')[0], String)) {
                key_description = output_date.get('tags')[0];
                output_date.remove('tags');
            }
            output_date.set('tags', []);
            for (key in keys) {
                var key_entry = new Map<String, String>();
                key_entry['key'] = key;
                if (key_description.length != 0) {
                    key_entry['description'] = key_description;
                }
                var tags = output_date.get('tags');
                tags.push(key_entry);
                output_date.set('tags', tags);
            }
            Sys.println(Json.stringify(output_date, null, '    '));
        } else {
            trace(keys.join(', '));
        }
    }

    public function parse_args() {
        var args = Sys.args();

        var argHandler = hxargs.Args.generate([
            @doc("Display this help and exit.")
            ["-h", "--help"] => function() help(),

            @doc("File containing the list of supported keys.")
            ["-k", "--key-file"] => function(key_file:String) this.key_file = key_file,

            @doc("Template taginfo.json which is used to merge with the list of keys.")
            ["-i", "--template-file"] => function(template_file:String) this.template_file = template_file,

            _ => function(arg:String) throw "Unknown argument: " +arg,
        ]);

        help_text = argHandler.getDoc();

        if (args.length == 0) {
            help();
        }

        argHandler.parse(args);

        if(key_file == null) {
            Sys.println('Missing required arguments: --key-file');
            Sys.exit(return_code.get('missing args'));
        }

        this.gen_taginfo();
    }

    public static function main() {
        new Gen_taginfo_json().parse_args();
    }
}
